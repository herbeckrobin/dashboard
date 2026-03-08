// SSL/TLS Infrastruktur-Rules

export default [
  {
    id: 'ssl-certificate',
    name: 'SSL-Zertifikat vorhanden',
    category: 'infra',
    order: 50,
    scope: 'project',
    severity: 'critical',

    async audit({ project, runCmd }) {
      const exists = (await runCmd(`test -d /etc/letsencrypt/live/${project.domain} && echo yes || echo no`)).trim()
      return {
        passed: exists === 'yes',
        actual: exists === 'yes' ? 'Zertifikat vorhanden' : 'Kein Zertifikat',
        expected: 'Let\'s Encrypt Zertifikat',
      }
    },

    async enforce({ project, runCmd, getConfig }) {
      const config = getConfig()
      const adminEmail = config.adminEmail || 'info@robinherbeck.com'
      // DNS-Check vor certbot (wie in deploy.js)
      const domainArg = project.wwwAlias ? `-d ${project.domain} -d www.${project.domain}` : `-d ${project.domain}`
      await runCmd(
        `sudo certbot --nginx --expand ${domainArg} --non-interactive --agree-tos --email ${adminEmail}`,
        { timeout: 60000 }
      )
      return { changed: true }
    },
  },

  {
    id: 'ssl-http2',
    name: 'HTTP/2 aktiviert',
    category: 'infra',
    order: 60,
    scope: 'project',
    severity: 'medium',

    async audit({ project, runCmd }) {
      const config = await runCmd(`cat /etc/nginx/sites-available/${project.domain} 2>/dev/null`)
      if (!config) return { passed: false, actual: 'Config fehlt', expected: 'HTTP/2' }
      // Pruefen ob listen 443 ssl http2 vorhanden
      const hasHttp2 = config.includes('http2') || config.includes('ssl')
      // Wenn noch auf Port 80 (kein SSL) → skip
      const noSSL = !config.includes('443')
      if (noSSL) return { passed: true, actual: 'Noch kein SSL (Port 80)', expected: 'HTTP/2 nach SSL' }
      return {
        passed: hasHttp2,
        actual: hasHttp2 ? 'HTTP/2 aktiv' : 'Nur HTTP/1.1',
        expected: 'HTTP/2 aktiviert',
      }
    },

    async enforce({ project, runCmd }) {
      // sed: listen 443 ssl → listen 443 ssl http2
      await runCmd(`sudo sed -i 's/listen 443 ssl;/listen 443 ssl http2;/g' /etc/nginx/sites-available/${project.domain}`)
      await runCmd('sudo nginx -t && sudo systemctl reload nginx')
      return { changed: true }
    },
  },
]
