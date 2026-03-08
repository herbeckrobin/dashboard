// HTTP Security Headers — prueft nginx-Configs der Projekte

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
      const hasHSTS = config.includes('Strict-Transport-Security')
      return {
        passed: hasHSTS,
        actual: hasHSTS ? 'Vorhanden' : 'Fehlt',
        expected: 'Strict-Transport-Security Header',
      }
    },
    enforce: null, // Wird ueber nginx-config Rule in infra/ behoben
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
        passed: config.includes('X-Frame-Options'),
        actual: config.includes('X-Frame-Options') ? 'Vorhanden' : 'Fehlt',
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
        passed: config.includes('X-Content-Type-Options'),
        actual: config.includes('X-Content-Type-Options') ? 'Vorhanden' : 'Fehlt',
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
        passed: config.includes('Referrer-Policy'),
        actual: config.includes('Referrer-Policy') ? 'Vorhanden' : 'Fehlt',
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
        passed: config.includes('Permissions-Policy'),
        actual: config.includes('Permissions-Policy') ? 'Vorhanden' : 'Fehlt',
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
    enforce: null, // Wird ueber nginx-config Rule in infra/ behoben
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
    enforce: null,
  },
]
