// Redaxo Install-Steps

import { createDatabase } from '../database'
import { generateStarterContent } from '../ai-generate'
import { getGitUrl, getGitConf } from './shared'
import { REDAXO_ADDONS } from '../redaxo-scaffold/config'
import { getAdminEmail } from '../config.js'

function getAiStep(project) {
  if (!project.aiDescription) return null
  return {
    name: 'AI Starter Content generieren',
    run: async () => {
      try {
        const result = await generateStarterContent(project)
        if (!result.success) {
          return { success: true, costUsd: result.costUsd, output: `AI uebersprungen: ${result.error}` }
        }
        if (result.hybrid) {
          console.log(`[AI] Redaxo Hybrid-Modus: ${result.output}`)
        }
        return result
      } catch (err) {
        return { success: true, output: `AI uebersprungen: ${err.message}` }
      }
    }
  }
}

export function getRedaxoSteps(project) {
  const { name, domain, database } = project
  const projectPath = `/home/deploy/apps/${name}`
  const gitUrl = getGitUrl(project.repo)
  const steps = []

  // 1. DB erstellen
  steps.push({
    name: 'Datenbank erstellen',
    run: async () => createDatabase(database)
  })

  // 2. Redaxo herunterladen (sudo rm fuer sauberen Start bei Retry)
  steps.push({
    name: 'Redaxo herunterladen',
    cmd: `sudo rm -rf ${projectPath} && mkdir -p ${projectPath} && curl -sL $(curl -s https://api.github.com/repos/redaxo/redaxo/releases/latest | grep browser_download_url | grep ".zip" | head -1 | cut -d'"' -f4) -o /tmp/redaxo.zip && cd ${projectPath} && unzip -qo /tmp/redaxo.zip && rm /tmp/redaxo.zip`
  })

  // 3. Addons installieren (Liste aus redaxo-scaffold/config.js)
  const addonCmds = REDAXO_ADDONS.map(a =>
    `curl -sL $(curl -s https://api.github.com/repos/${a.repo}/releases/latest | grep zipball_url | cut -d'"' -f4) -o /tmp/${a.name}.zip && mkdir -p /tmp/${a.name}-extract && unzip -qo /tmp/${a.name}.zip -d /tmp/${a.name}-extract && mv /tmp/${a.name}-extract/*-* ${projectPath}/redaxo/src/addons/${a.name} && rm -rf /tmp/${a.name}.zip /tmp/${a.name}-extract && echo "${a.name} installiert"`
  ).join(' && ')

  steps.push({
    name: `Addons installieren (${REDAXO_ADDONS.map(a => a.name).join(', ')})`,
    cmd: addonCmds
  })

  // 4. AI Starter Content ODER Default-Testinhalte
  const redaxoAiStep = getAiStep(project)
  if (redaxoAiStep) {
    steps.push(redaxoAiStep)
  } else {
    steps.push({
      name: 'Standard-Startseite generieren',
      run: async () => {
        const { generateStyleCSS, generateSetupPhp, BOOT_PHP, DEFAULT_REDAXO_CONTENT } = await import('../redaxo-scaffold')
        const fs = await import('fs')
        const path = await import('path')

        const cssDir = path.join(projectPath, 'assets', 'css')
        fs.mkdirSync(cssDir, { recursive: true })
        fs.writeFileSync(path.join(cssDir, 'style.css'), generateStyleCSS(DEFAULT_REDAXO_CONTENT.theme), 'utf8')

        const setupDir = path.join(projectPath, 'redaxo', 'src', 'addons', 'project', 'lib')
        fs.mkdirSync(setupDir, { recursive: true })
        fs.writeFileSync(path.join(setupDir, 'setup.php'), generateSetupPhp(DEFAULT_REDAXO_CONTENT, name), 'utf8')

        const bootDir = path.join(projectPath, 'redaxo', 'src', 'addons', 'project')
        fs.writeFileSync(path.join(bootDir, 'boot.php'), BOOT_PHP, 'utf8')

        return { success: true, output: 'Standard-Startseite mit 5 Sections vorbereitet (Hero, Features, About, Stats, Contact)' }
      }
    })
  }

  // 5. Config.yml mit DB-Daten vorausfuellen
  steps.push({
    name: 'Config vorbereiten',
    run: async () => {
      const { generateConfigYml } = await import('../redaxo-scaffold')
      const fs = await import('fs')
      const path = await import('path')
      const configDir = path.join(projectPath, 'redaxo', 'data', 'core')
      fs.mkdirSync(configDir, { recursive: true })
      fs.writeFileSync(
        path.join(configDir, 'config.yml'),
        generateConfigYml({
          domain, name,
          dbHost: database.host,
          dbUser: database.user,
          dbPassword: database.password,
          dbName: database.name,
          setupDone: false,
          adminEmail: getAdminEmail(),
        })
      )
      return { success: true, output: `config.yml geschrieben (DB-Daten vorausgefuellt, setup: true)` }
    }
  })

  // 6. Schreibbare Verzeichnisse fuer PHP-FPM
  steps.push({
    name: 'Berechtigungen setzen',
    cmd: `mkdir -p ${projectPath}/media ${projectPath}/assets ${projectPath}/redaxo/cache && sudo chown -R deploy:www-data ${projectPath} && sudo chmod -R g+w ${projectPath}/redaxo/data ${projectPath}/redaxo/cache ${projectPath}/redaxo/src ${projectPath}/media ${projectPath}/assets && sudo find ${projectPath}/redaxo/data ${projectPath}/redaxo/cache ${projectPath}/redaxo/src ${projectPath}/media ${projectPath}/assets -type d -exec chmod g+s {} + && echo "Berechtigungen gesetzt"`
  })

  // 7. Git Push
  steps.push({
    name: 'Git Push (Redaxo)',
    cmd: `cd ${projectPath} && git init -b main && git add -A && git ${getGitConf()} commit -m "Redaxo Installation" && git remote add origin ${gitUrl} && git push -u origin main --force`
  })

  return {
    steps,
    info: {
      adminUrl: `https://${domain}/redaxo/`,
      dbName: database.name,
      dbUser: database.user,
      dbPassword: database.password,
      note: 'Web-Setup unter /redaxo/ abschliessen (DB-Daten vorausgefuellt). Beim ersten Backend-Login werden Module + Startseite automatisch erstellt.'
    }
  }
}
