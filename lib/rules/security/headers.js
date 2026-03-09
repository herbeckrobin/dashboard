// HTTP Security Headers — prueft nginx-Configs der Projekte
// Erkennt sowohl inline add_header als auch include snippets/security-headers.conf

function hasHeaderOrSnippet(config, headerName) {
  if (config.includes('snippets/security-headers.conf')) return true
  return config.includes(headerName)
}

export default [
  {
    id: 'header-hsts',
    name: 'HSTS Header (Strict-Transport-Security)',
    category: 'security',
    scope: 'project',
    severity: 'critical',

    async audit({ project, runCmd }) {
      const config = await runCmd(`cat /etc/nginx/sites-available/${project.domain} 2>/dev/null`)
      if (!config) return { passed: false, actual: 'nginx Config fehlt', expected: 'HSTS Header' }
      const hasSnippet = config.includes('snippets/security-headers.conf')
      const hasHSTS = config.includes('Strict-Transport-Security')
      return {
        passed: hasSnippet || hasHSTS,
        actual: hasSnippet ? 'Via Snippet' : (hasHSTS ? 'HSTS vorhanden' : 'Fehlt'),
        expected: 'HSTS Header',
      }
    },
    enforce: null,
  },

  {
    id: 'header-frame-options',
    name: 'X-Frame-Options Header',
    category: 'security',
    scope: 'project',
    severity: 'high',

    async audit({ project, runCmd }) {
      const config = await runCmd(`cat /etc/nginx/sites-available/${project.domain} 2>/dev/null`)
      if (!config) return { passed: false, actual: 'nginx Config fehlt', expected: 'X-Frame-Options' }
      return {
        passed: hasHeaderOrSnippet(config, 'X-Frame-Options'),
        actual: hasHeaderOrSnippet(config, 'X-Frame-Options') ? 'Vorhanden' : 'Fehlt',
        expected: 'X-Frame-Options: SAMEORIGIN',
      }
    },
    enforce: null,
  },

  {
    id: 'header-content-type',
    name: 'X-Content-Type-Options Header',
    category: 'security',
    scope: 'project',
    severity: 'high',

    async audit({ project, runCmd }) {
      const config = await runCmd(`cat /etc/nginx/sites-available/${project.domain} 2>/dev/null`)
      if (!config) return { passed: false, actual: 'nginx Config fehlt', expected: 'nosniff' }
      return {
        passed: hasHeaderOrSnippet(config, 'X-Content-Type-Options'),
        actual: hasHeaderOrSnippet(config, 'X-Content-Type-Options') ? 'Vorhanden' : 'Fehlt',
        expected: 'X-Content-Type-Options: nosniff',
      }
    },
    enforce: null,
  },

  {
    id: 'header-referrer',
    name: 'Referrer-Policy Header',
    category: 'security',
    scope: 'project',
    severity: 'medium',

    async audit({ project, runCmd }) {
      const config = await runCmd(`cat /etc/nginx/sites-available/${project.domain} 2>/dev/null`)
      if (!config) return { passed: false, actual: 'nginx Config fehlt', expected: 'Referrer-Policy' }
      return {
        passed: hasHeaderOrSnippet(config, 'Referrer-Policy'),
        actual: hasHeaderOrSnippet(config, 'Referrer-Policy') ? 'Vorhanden' : 'Fehlt',
        expected: 'Referrer-Policy Header',
      }
    },
    enforce: null,
  },

  {
    id: 'header-permissions',
    name: 'Permissions-Policy Header',
    category: 'security',
    scope: 'project',
    severity: 'medium',

    async audit({ project, runCmd }) {
      const config = await runCmd(`cat /etc/nginx/sites-available/${project.domain} 2>/dev/null`)
      if (!config) return { passed: false, actual: 'nginx Config fehlt', expected: 'Permissions-Policy' }
      return {
        passed: hasHeaderOrSnippet(config, 'Permissions-Policy'),
        actual: hasHeaderOrSnippet(config, 'Permissions-Policy') ? 'Vorhanden' : 'Fehlt',
        expected: 'Permissions-Policy Header',
      }
    },
    enforce: null,
  },

  {
    id: 'header-csp',
    name: 'Content-Security-Policy Header',
    category: 'security',
    scope: 'project',
    severity: 'high',

    async audit({ project, runCmd }) {
      const config = await runCmd(`cat /etc/nginx/sites-available/${project.domain} 2>/dev/null`)
      if (!config) return { passed: false, actual: 'nginx Config fehlt', expected: 'CSP Header' }
      return {
        passed: config.includes('Content-Security-Policy'),
        actual: config.includes('Content-Security-Policy') ? 'Vorhanden' : 'Fehlt',
        expected: 'Content-Security-Policy Header',
      }
    },
    enforce: null,
  },

  {
    id: 'header-no-xss-protection',
    name: 'Kein X-XSS-Protection Header (deprecated)',
    category: 'security',
    scope: 'project',
    severity: 'medium',

    async audit({ project, runCmd }) {
      const config = await runCmd(`cat /etc/nginx/sites-available/${project.domain} 2>/dev/null`)
      if (!config) return { passed: true, actual: 'nginx Config fehlt', expected: 'Kein X-XSS-Protection' }
      const hasXSS = config.includes('X-XSS-Protection')
      return {
        passed: !hasXSS,
        actual: hasXSS ? 'X-XSS-Protection vorhanden (deprecated seit 2021)' : 'Nicht vorhanden (korrekt)',
        expected: 'Kein X-XSS-Protection Header',
      }
    },

    async enforce({ project, runCmd }) {
      // Zeile mit X-XSS-Protection aus nginx Config entfernen
      await runCmd(`sudo sed -i '/X-XSS-Protection/d' /etc/nginx/sites-available/${project.domain}`)
      await runCmd('sudo nginx -t && sudo systemctl reload nginx')
      return { changed: true }
    },
  },

  {
    id: 'nginx-server-tokens',
    name: 'nginx server_tokens deaktiviert',
    category: 'security',
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      // Global in nginx.conf oder conf.d/ pruefen
      const output = await runCmd('grep -r "server_tokens" /etc/nginx/nginx.conf /etc/nginx/conf.d/ 2>/dev/null')
      const hasOff = output.includes('server_tokens off')
      return {
        passed: hasOff,
        actual: hasOff ? 'server_tokens off' : output.trim() || 'Nicht gesetzt (Default: on)',
        expected: 'server_tokens off',
      }
    },

    async enforce({ runCmd }) {
      // Auskommentierte Zeile einkommentieren oder hinzufuegen
      const check = await runCmd('grep -n "server_tokens" /etc/nginx/nginx.conf')
      if (check.includes('#')) {
        // Auskommentierte Zeile durch aktive ersetzen (Tab + # + optionale Spaces)
        await runCmd("sudo sed -i '/server_tokens/c\\\\tserver_tokens off;' /etc/nginx/nginx.conf")
      } else if (!check.includes('server_tokens off')) {
        // In http-Block einfuegen (nach sendfile)
        await runCmd("sudo sed -i '/sendfile/a\\\\tserver_tokens off;' /etc/nginx/nginx.conf")
      }
      await runCmd('sudo nginx -t && sudo systemctl reload nginx')
      return { changed: true }
    },
  },

  {
    id: 'nginx-tls-version',
    name: 'Nur TLS 1.2+ erlaubt (kein TLS 1.0/1.1)',
    category: 'security',
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      const output = await runCmd('grep -E "ssl_protocols" /etc/nginx/nginx.conf 2>/dev/null')
      if (!output.trim()) {
        return { passed: true, actual: 'Nicht gesetzt (Certbot managed)', expected: 'Kein TLSv1/TLSv1.1' }
      }
      const hasTls10 = output.includes('TLSv1 ') || output.includes('TLSv1;')
      const hasTls11 = output.includes('TLSv1.1')
      return {
        passed: !hasTls10 && !hasTls11,
        actual: output.trim(),
        expected: 'ssl_protocols TLSv1.2 TLSv1.3',
      }
    },

    async enforce({ runCmd }) {
      await runCmd("sudo sed -i 's/ssl_protocols.*/ssl_protocols TLSv1.2 TLSv1.3;/' /etc/nginx/nginx.conf")
      await runCmd('sudo nginx -t && sudo systemctl reload nginx')
      return { changed: true }
    },
  },
]
