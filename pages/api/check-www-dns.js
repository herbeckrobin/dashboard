// Cronjob-Endpoint: Prueft ausstehende SSL-Zertifikate (Haupt- und www-Domain)
// Wird alle 10 Minuten per Cron aufgerufen: curl -s http://localhost:3005/api/check-www-dns

import fs from 'fs'
import dns from 'dns'
import { getProjects, updateProject } from '../../lib/db'
import { runCommand } from '../../lib/run-command'
import { getAdminEmail } from '../../lib/config'
import { escapeShellArg } from '../../lib/validate'

async function getServerIp() {
  const result = await runCommand("ip -4 addr show | grep 'inet ' | grep -v '127.0.0' | grep -v '172.' | awk '{print $2}' | cut -d/ -f1 | head -1")
  return result.output?.trim()
}

async function activateSSL(domain, certDomains, id, updates, subject, body) {
  const certResult = await runCommand(
    `sudo certbot --nginx --expand ${certDomains} --non-interactive --agree-tos --email ${getAdminEmail()}`
  )
  if (!certResult.success) return { status: 'certbot-failed', error: certResult.error }

  // HTTP/2 aktivieren
  await runCommand(
    `sudo sed -i 's/listen 443 ssl;/listen 443 ssl http2;/g' /etc/nginx/sites-available/${escapeShellArg(domain)} && sudo nginx -t && sudo systemctl reload nginx`
  )

  // Flags aktualisieren
  updateProject(id, updates)

  // Mail senden
  const mailContent = [
    `To: ${getAdminEmail()}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body
  ].join('\n')
  const tmpMail = `/tmp/mail-ssl-${domain}.txt`
  fs.writeFileSync(tmpMail, mailContent)
  await runCommand(`sendmail -t < ${tmpMail} && rm -f ${tmpMail}`)

  return { status: 'ssl-activated' }
}

export default async function handler(req, res) {
  // Nur lokal aufrufbar (Cron) — Pruefe sowohl Socket-IP als auch X-Real-IP
  // X-Real-IP wird von nginx gesetzt und zeigt die echte Client-IP
  const remoteIp = req.socket.remoteAddress
  const realIp = req.headers['x-real-ip']
  const isLocal = (remoteIp === '127.0.0.1' || remoteIp === '::1' || remoteIp === '::ffff:127.0.0.1')
  // Wenn X-Real-IP gesetzt ist, kommt der Request ueber nginx — dann muss auch die echte IP lokal sein
  if (!isLocal || (realIp && realIp !== '127.0.0.1' && realIp !== '::1')) {
    return res.status(403).json({ error: 'Nur lokal aufrufbar' })
  }

  // Projekte mit ausstehender SSL-Aktivierung (Haupt- oder www-Domain)
  const projects = getProjects().filter(p => p.sslPending || (p.wwwAlias && p.wwwPendingSSL))
  if (projects.length === 0) {
    return res.json({ message: 'Keine ausstehenden Domains', checked: 0 })
  }

  const serverIp = await getServerIp()
  const results = []

  for (const project of projects) {
    const { domain, id } = project
    try {
      // Haupt-Domain pruefen
      if (project.sslPending) {
        let mainReady = false
        try {
          const ips = await dns.promises.resolve4(domain)
          mainReady = ips.includes(serverIp)
        } catch { /* DNS nicht auflösbar */ }

        if (!mainReady) {
          results.push({ domain, status: 'main-dns-pending' })
          continue
        }

        // Haupt-Domain bereit — welche Domains ins Zertifikat?
        let certDomains = `-d ${domain}`
        let wwwReady = false
        if (project.wwwAlias) {
          try {
            const wwwIps = await dns.promises.resolve4(`www.${domain}`)
            wwwReady = wwwIps.includes(serverIp)
          } catch { /* www DNS nicht auflösbar */ }
          if (wwwReady) certDomains += ` -d www.${domain}`
        }

        const result = await activateSSL(domain, certDomains, id, {
          sslPending: false,
          ...(project.wwwAlias ? { wwwPendingSSL: !wwwReady } : {})
        },
          `SSL aktiviert: ${domain}`,
          `${domain} ist jetzt per HTTPS erreichbar.\n\nhttps://${domain}${wwwReady ? `\nhttps://www.${domain}` : '\n\nHinweis: www-Domain steht noch aus.'}`
        )
        results.push({ domain, ...result })
        continue
      }

      // Nur www-Domain ausstehend (Hauptdomain hat bereits SSL)
      if (project.wwwAlias && project.wwwPendingSSL) {
        let wwwReady = false
        try {
          const wwwIps = await dns.promises.resolve4(`www.${domain}`)
          wwwReady = wwwIps.includes(serverIp)
        } catch { /* www DNS nicht auflösbar */ }

        if (!wwwReady) {
          results.push({ domain, status: 'www-dns-pending' })
          continue
        }

        const result = await activateSSL(domain, `-d ${domain} -d www.${domain}`, id,
          { wwwPendingSSL: false },
          `www.${domain} SSL aktiviert`,
          `www.${domain} ist jetzt erreichbar.\n\nSSL-Zertifikat fuer beide Domains:\nhttps://${domain}\nhttps://www.${domain}`
        )
        results.push({ domain, ...result })
      }
    } catch (err) {
      results.push({ domain, status: 'error', error: err.message })
    }
  }

  res.json({ checked: projects.length, results })
}
