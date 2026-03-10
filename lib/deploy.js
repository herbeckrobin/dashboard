import fs from 'fs'
import dns from 'dns'
import { runCommand, runCommandLive } from './run-command'
import { initLog, updateStep, finishLog, scanDirectory, trackFilesFromDiff } from './deploy-log'
import { getConfig, getDomainConfig, getAdminEmail } from './config'
import { getProjects, updateProject } from './db'
import { getInstallSteps } from './install'
import { registerDeploy, unregisterDeploy } from './deploy-abort'
import { escapeShellArg, validateGitSubPath } from './validate'

export function getNextPort() {
  const projects = getProjects()
  const usedPorts = projects
    .map(p => p.port)
    .filter(p => typeof p === 'number' && p >= 4000)
  const maxPort = usedPorts.length > 0 ? Math.max(...usedPorts) : 3999
  return maxPort + 1
}

export async function deployProject(project, { trigger = 'manual', triggerInfo = null } = {}) {
  const { id, name, domain, type, repo } = project
  const port = project.port || getNextPort()
  const projectPath = `/home/deploy/apps/${name}`

  // gitSubPath validieren gegen Command Injection
  if (project.gitSubPath) {
    const subPathCheck = validateGitSubPath(project.gitSubPath)
    if (!subPathCheck.valid) {
      return { success: false, step: 'Validierung', error: subPathCheck.error }
    }
  }
  const gitPath = project.gitSubPath ? `${projectPath}/${project.gitSubPath}` : projectPath

  // Git URL ohne Token (Token wird per credential helper uebergeben, verhindert Leakage in Logs)
  const config = getConfig()
  const token = config.giteaToken
  const gitUrl = `http://localhost:3000/${repo}.git`
  // Git-Credential-Helper: Token sicher uebergeben ohne URL-Einbettung
  const gitCredentialHelper = token
    ? `-c credential.helper='!f() { echo "username=token"; echo "password=${token.replace(/'/g, "'\\''")}"; }; f'`
    : ''

  const steps = []
  let frameworkInfo = null
  let aiCostUsd = 0

  // 0. Framework-Installation (nur beim ersten Deploy)
  const installResult = getInstallSteps(project)
  if (installResult) {
    frameworkInfo = installResult.info
    for (const step of installResult.steps) {
      steps.push(step)
    }
  }

  // 1. Clone oder Pull
  steps.push({
    name: 'Git Clone / Pull',
    cmd: `if [ -d "${gitPath}/.git" ]; then cd ${gitPath} && git ${gitCredentialHelper} fetch origin && BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo main) && if git rev-parse --verify origin/$BRANCH >/dev/null 2>&1; then git reset --hard origin/$BRANCH; else echo "Remote branch origin/$BRANCH existiert noch nicht - uebersprungen"; fi; else git ${gitCredentialHelper} clone ${gitUrl} ${gitPath}; fi`
  })

  // 1.5 .env-Datei schreiben (wenn Umgebungsvariablen konfiguriert)
  if (project.envVars && project.envVars.length > 0) {
    const envEntries = project.envVars.filter(e => e.key)
    if (envEntries.length > 0) {
      const envContent = envEntries.map(e => `${e.key}=${e.value}`).join('\n')
      steps.push({
        name: '.env schreiben',
        pre: () => fs.writeFileSync(`${projectPath}/.env`, envContent + '\n'),
        cmd: `echo ".env mit ${envEntries.length} Variablen geschrieben"`
      })
    }
  }

  // 2. Projekt-Validierung (bei Node/Next.js: package.json muss existieren)
  if (type === 'nextjs' || type === 'node') {
    steps.push({
      name: 'Projekt validieren',
      cmd: `cd ${projectPath} && if [ ! -f package.json ]; then echo "FEHLER: package.json fehlt in ${projectPath} — Deploy abgebrochen" >&2; exit 1; fi && echo "package.json gefunden"`
    })
  }

  // 3. Dependencies
  if (type === 'nextjs' || type === 'node') {
    // .env vor bun install umbenennen (Bun 1.3.x crasht bei .env-Dateien)
    steps.push({ name: 'Dependencies installieren', cmd: `cd ${projectPath} && if [ -f .env ]; then mv .env .env.bak; fi && bun install && if [ -f .env.bak ]; then mv .env.bak .env; fi` })
  }

  // 3.5 Pre-Build Befehl (z.B. prisma generate)
  if (project.preBuildCmd && project.preBuildCmd.trim()) {
    steps.push({
      name: 'Pre-Build Befehl',
      cmd: `cd ${projectPath} && ${project.preBuildCmd.trim().replace(/\bnpx\b/g, 'bunx')}`
    })
  }

  // 4. Build
  if (type === 'nextjs') {
    steps.push({ name: 'Build', cmd: `cd ${projectPath} && bun run build` })
  }

  // 5a. Alte nginx Config entfernen (bei Domain-Aenderung)
  if (project.previousDomain && project.previousDomain !== domain) {
    const oldDomain = project.previousDomain
    steps.push({
      name: 'Alte Domain aufräumen',
      cmd: `sudo rm -f /etc/nginx/sites-enabled/${escapeShellArg(oldDomain)} /etc/nginx/sites-available/${escapeShellArg(oldDomain)} && sudo nginx -t && sudo systemctl reload nginx`
    })
  }

  // 5b. nginx Config
  const nginxConfig = generateNginxConfig(domain, port, type, projectPath, project)
  const tmpNginxPath = `/tmp/nginx-${domain}.conf`
  steps.push({
    name: 'nginx Config',
    pre: () => fs.writeFileSync(tmpNginxPath, nginxConfig),
    cmd: `sudo mv ${tmpNginxPath} /etc/nginx/sites-available/${domain}`
  })

  // 6. nginx aktivieren
  steps.push({
    name: 'nginx aktivieren',
    cmd: `sudo ln -sf /etc/nginx/sites-available/${domain} /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx`
  })

  // 7. SSL — DNS pruefen bevor Certbot laeuft (nur fuer eigene Domains)
  let mainDnsReady = true
  let wwwDnsReady = false
  const { serverDomain } = getDomainConfig()
  const isCustomDomain = !serverDomain || !domain.endsWith(`.${serverDomain}`)
  if (isCustomDomain) {
    try {
      const serverIpResult = await runCommand("ip -4 addr show | grep 'inet ' | grep -v '127.0.0' | grep -v '172.' | awk '{print $2}' | cut -d/ -f1 | head -1")
      const serverIp = serverIpResult.output?.trim()
      const domainIps = await dns.promises.resolve4(domain)
      mainDnsReady = domainIps.includes(serverIp)
      if (mainDnsReady && project.wwwAlias) {
        try {
          const wwwIps = await dns.promises.resolve4(`www.${domain}`)
          wwwDnsReady = wwwIps.includes(serverIp)
        } catch { /* www DNS nicht auflösbar */ }
      }
    } catch { mainDnsReady = false }
  } else if (project.wwwAlias) {
    wwwDnsReady = true // Dev-Subdomains brauchen keinen DNS-Check
  }

  if (mainDnsReady) {
    const certDomains = (project.wwwAlias && wwwDnsReady) ? `-d ${domain} -d www.${domain}` : `-d ${domain}`
    steps.push({
      name: 'SSL Zertifikat',
      cmd: `sudo certbot --nginx --expand ${certDomains} --non-interactive --agree-tos --email ${getAdminEmail()} || true`
    })

    // HTTP/2 aktivieren (Certbot setzt nur "listen 443 ssl;")
    steps.push({
      name: 'HTTP/2 aktivieren',
      cmd: `sudo sed -i 's/listen 443 ssl;/listen 443 ssl http2;/g' /etc/nginx/sites-available/${domain} && sudo nginx -t && sudo systemctl reload nginx`
    })
  } else {
    steps.push({
      name: 'SSL Zertifikat',
      cmd: 'echo "DNS zeigt noch nicht auf den Server — SSL wird per Cronjob nachgeholt"'
    })
  }

  // 8. PM2 (nur Node/Next.js) — ecosystem.config.js mit Umgebungsvariablen
  if (type === 'nextjs' || type === 'node') {
    const envObj = { PORT: String(port) }
    if (project.envVars) {
      for (const e of project.envVars) {
        if (e.key) envObj[e.key] = e.value
      }
    }
    steps.push({
      name: 'PM2 Prozess starten',
      pre: () => {
        const ecosystemContent = `module.exports = {
  apps: [{
    name: '${name}',
    script: 'bun',
    args: 'run start',
    cwd: '${projectPath}',
    env: ${JSON.stringify(envObj, null, 6)}
  }]
}\n`
        fs.writeFileSync(`${projectPath}/ecosystem.config.js`, ecosystemContent)
      },
      cmd: `cd ${projectPath} && pm2 delete ${escapeShellArg(name)} 2>/dev/null; pm2 start ecosystem.config.js && pm2 save`
    })
  }

  // 8. Gitea Webhook registrieren (nur wenn Token vorhanden)
  if (token && repo) {
    steps.push({
      name: 'Webhook einrichten',
      run: async () => {
        const webhookUrl = `http://172.18.0.1:9000/webhook`
        const webhookSecret = process.env.WEBHOOK_SECRET
        if (!webhookSecret) {
          return { success: false, output: 'WEBHOOK_SECRET Umgebungsvariable nicht gesetzt' }
        }
        const giteaApi = `http://localhost:3000/api/v1/repos/${repo}/hooks`
        const giteaHeaders = { 'Content-Type': 'application/json', 'Authorization': `token ${token}` }

        // Bestehende Hooks abrufen
        const existing = await fetch(giteaApi, { headers: giteaHeaders })
        const hooks = await existing.json()

        if (Array.isArray(hooks)) {
          // Bestehenden Webhook auf gleiches Projekt finden und aktualisieren
          for (const hook of hooks) {
            if (hook.config?.url?.includes('/deploy/') || hook.config?.url?.includes('/webhook')) {
              await fetch(`http://localhost:3000/api/v1/repos/${repo}/hooks/${hook.id}`, {
                method: 'PATCH',
                headers: giteaHeaders,
                body: JSON.stringify({
                  config: { url: webhookUrl, content_type: 'json', secret: webhookSecret },
                  events: ['push'],
                  active: true
                })
              })
              return { success: true, output: 'Webhook aktualisiert (mit Secret)' }
            }
          }
        }

        // Neuen Webhook erstellen
        const res = await fetch(giteaApi, {
          method: 'POST',
          headers: giteaHeaders,
          body: JSON.stringify({
            type: 'gitea',
            config: { url: webhookUrl, content_type: 'json', secret: webhookSecret },
            events: ['push'],
            active: true
          })
        })
        if (!res.ok) {
          const err = await res.text()
          return { success: false, error: `Webhook Fehler: ${err}` }
        }
        return { success: true, output: 'Webhook erstellt' }
      }
    })
  }

  // Log initialisieren
  const stepNames = steps.map(s => s.name)
  initLog(id, stepNames, trigger, triggerInfo)

  // Abort-Signal registrieren
  const abortSignal = registerDeploy(id)

  // Anzahl der Install-Steps (fuer File-Tracking bei Erstinstallation)
  const installStepCount = installResult ? installResult.steps.length : 0

  // Steps ausfuehren mit Live-Logging
  for (let i = 0; i < steps.length; i++) {
    // Abort-Check vor jedem Step
    if (abortSignal.aborted) {
      updateStep(id, i, {
        status: 'error',
        output: 'Deploy abgebrochen',
        finishedAt: new Date().toISOString()
      })
      finishLog(id, false, name)
      unregisterDeploy(id)
      return { success: false, step: steps[i].name, error: 'Deploy abgebrochen', aiCostUsd }
    }

    const step = steps[i]

    // File-Tracking: Snapshot vor Install-Steps erstellen
    const isInstallStep = i < installStepCount
    let beforeSnapshot = null
    if (isInstallStep) {
      try { beforeSnapshot = scanDirectory(projectPath) } catch {}
    }

    updateStep(id, i, { status: 'running', startedAt: new Date().toISOString() })

    if (step.pre) step.pre()
    const onOutput = (output) => updateStep(id, i, { liveOutput: output })
    let result = step.run
      ? await step.run(onOutput)
      : await runCommandLive(step.cmd, 300000, onOutput, abortSignal)

    // Build-Retry: Bei fehlenden Modulen auf Noop-Modul umleiten (nicht installieren!)
    if (!result.success && step.name === 'Build' && result.error) {
      let retries = 0
      const stubPkgs = new Set()
      // Bestehende stub-packages.json laden
      const stubJsonPath = `${projectPath}/lib/stub-packages.json`
      try { const existing = JSON.parse(fs.readFileSync(stubJsonPath, 'utf8')); existing.forEach(p => stubPkgs.add(p)) } catch {}

      while (retries < 5) {
        // Zwei Fehler-Patterns: webpack "Module not found" und Node "Cannot find module"
        const webpackMatch = result.error.match(/Module not found: Can't resolve '([^']+)'/)
        const nodeMatch = result.error.match(/Cannot find module '([^']+)'/)
        const moduleMatch = webpackMatch || nodeMatch
        if (!moduleMatch) break
        const missingModule = moduleMatch[1]
        if (missingModule.startsWith('.') || missingModule.startsWith('@/') || missingModule.startsWith('/')) break

        const pkgName = missingModule.startsWith('@') ? missingModule.split('/').slice(0, 2).join('/') : missingModule.split('/')[0]
        if (stubPkgs.has(pkgName)) break // Schon geblockt, anderer Fehler
        stubPkgs.add(pkgName)

        // stub-packages.json aktualisieren → next.config.js liest das und erstellt webpack aliases
        updateStep(id, i, { liveOutput: `Package "${pkgName}" wird auf Noop-Modul umgeleitet (Retry ${retries + 1}/5)...\n` })
        const libDir = `${projectPath}/lib`
        if (!fs.existsSync(libDir)) fs.mkdirSync(libDir, { recursive: true })
        fs.writeFileSync(stubJsonPath, JSON.stringify([...stubPkgs], null, 2), 'utf8')

        result = await runCommandLive(step.cmd, 300000, onOutput, abortSignal)
        if (result.success || abortSignal.aborted) break
        retries++
      }
    }

    // AI-Kosten akkumulieren
    if (result.costUsd) aiCostUsd += result.costUsd

    if (result.success) {
      // File-Tracking: Neue Dateien nach Install-Step erkennen
      if (isInstallStep && beforeSnapshot) {
        try {
          const afterSnapshot = scanDirectory(projectPath)
          trackFilesFromDiff(id, projectPath, beforeSnapshot, afterSnapshot)
        } catch {}
      }

      updateStep(id, i, {
        status: 'done',
        output: result.output || 'OK',
        costUsd: result.costUsd || undefined,
        finishedAt: new Date().toISOString()
      })
    } else {
      updateStep(id, i, {
        status: 'error',
        output: result.error,
        costUsd: result.costUsd || undefined,
        finishedAt: new Date().toISOString()
      })
      finishLog(id, false, name)
      unregisterDeploy(id)
      return { success: false, step: step.name, error: result.error, aiCostUsd }
    }
  }

  finishLog(id, true, name)
  unregisterDeploy(id)

  // Framework als installiert markieren + previousDomain aufräumen
  const postDeployUpdates = {}
  if (installResult && frameworkInfo) {
    postDeployUpdates.frameworkInstalled = true
    postDeployUpdates.frameworkInfo = frameworkInfo
  }
  if (project.previousDomain) {
    postDeployUpdates.previousDomain = null
  }
  // SSL-Flags: Nachholen per Cronjob wenn DNS noch nicht bereit
  if (isCustomDomain && !mainDnsReady) {
    postDeployUpdates.sslPending = true
  } else if (project.sslPending) {
    postDeployUpdates.sslPending = false
  }
  if (project.wwwAlias) {
    postDeployUpdates.wwwPendingSSL = !wwwDnsReady
  }
  // AI-Kosten im Projekt speichern (kumulativ)
  if (aiCostUsd > 0) {
    const aiModel = config.aiAgentMode ? (config.agentModel || 'claude-haiku-4-5') : (config.aiModel || 'unknown')
    const mode = config.aiAgentMode ? 'agent' : 'standard'
    const existingCosts = project.aiCosts || []
    postDeployUpdates.aiCosts = [...existingCosts, {
      date: new Date().toISOString(),
      costUsd: Math.round(aiCostUsd * 10000) / 10000,
      model: aiModel,
      mode,
    }]
    postDeployUpdates.aiCostTotal = Math.round(
      (existingCosts.reduce((sum, c) => sum + (c.costUsd || 0), 0) + aiCostUsd) * 10000
    ) / 10000
  }
  if (Object.keys(postDeployUpdates).length > 0) {
    updateProject(id, postDeployUpdates)
  }

  return { success: true, port, aiCostUsd }
}

export function generateNginxConfig(domain, port, type, projectPath, project = {}) {
  const passwordEnabled = project.passwordEnabled || false
  const uploadLimit = project.uploadLimit || ''
  const phpVersion = project.phpVersion || '8.2'
  const docRoot = project.docRoot || ''
  // www-Alias: beide Domains im server_name
  const wwwAlias = project.wwwAlias || false
  const serverNames = wwwAlias ? `${domain} www.${domain}` : domain

  const authBlock = passwordEnabled ? `
        auth_basic "Passwort erforderlich";
        auth_basic_user_file /etc/nginx/htpasswd/${domain};` : ''

  const uploadBlock = uploadLimit ? `\n    client_max_body_size ${uploadLimit};` : ''
  const rootPath = docRoot ? `${projectPath}/${docRoot}` : projectPath

  // Redaxo: Sensible Verzeichnisse schuetzen (offizielle Doku-Empfehlung)
  const redaxoBlock = project.framework === 'redaxo' ? `

    autoindex off;
    location ^~ /redaxo/src { deny all; }
    location ^~ /redaxo/data { deny all; }
    location ^~ /redaxo/cache { deny all; }
    location ^~ /redaxo/bin { deny all; }` : ''

  // TYPO3: Sensible Verzeichnisse schuetzen (Defense-in-Depth)
  const typo3Block = project.framework === 'typo3' ? `

    autoindex off;
    location = /composer.json { deny all; }
    location = /composer.lock { deny all; }` : ''

  // Contao: Sensible Verzeichnisse schuetzen (Defense-in-Depth)
  const contaoBlock = project.framework === 'contao' ? `

    autoindex off;
    location = /composer.json { deny all; }
    location = /composer.lock { deny all; }` : ''

  const securityHeaders = `
    include snippets/security-headers.conf;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; frame-src 'self' blob:; frame-ancestors 'self';" always;`

  if (type === 'php') {
    return `server {
    server_name ${serverNames};
    root ${rootPath};
    index index.php index.html;${uploadBlock}
${securityHeaders}

    location / {${authBlock}
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php${phpVersion}-fpm.sock;
    }

    location ~ /\\.ht {
        deny all;
    }${redaxoBlock}${typo3Block}${contaoBlock}

    listen 80;
}`
  }

  if (type === 'static') {
    return `server {
    server_name ${serverNames};
    root ${rootPath};
    index index.html;${uploadBlock}
${securityHeaders}

    location / {${authBlock}
        try_files $uri $uri/ =404;
    }

    listen 80;
}`
  }

  return `server {
    server_name ${serverNames};${uploadBlock}
${securityHeaders}

    location / {${authBlock}
        proxy_pass http://localhost:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 80;
}`
}
