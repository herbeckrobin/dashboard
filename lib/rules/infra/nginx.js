// nginx Infrastruktur-Rules

import { generateNginxConfig } from '../../deploy.js'

export default [
  {
    id: 'nginx-config-exists',
    name: 'nginx Config vorhanden',
    category: 'infra',
    order: 10,
    scope: 'project',
    severity: 'critical',

    async audit({ project, runCmd }) {
      const exists = (await runCmd(`test -f /etc/nginx/sites-available/${project.domain} && echo yes || echo no`)).trim()
      return {
        passed: exists === 'yes',
        actual: exists === 'yes' ? 'Config vorhanden' : 'Config fehlt',
        expected: 'Config in sites-available',
      }
    },

    async enforce({ project, runCmd, writeNginxConfig: writeConfig }) {
      const projectPath = `/home/deploy/apps/${project.name}`
      const config = generateNginxConfig(project.domain, project.port, project.type, projectPath, project)
      await writeConfig(project.domain, config)
      await runCmd('sudo nginx -t && sudo systemctl reload nginx')
      return { changed: true }
    },
  },

  {
    id: 'nginx-site-enabled',
    name: 'nginx Site aktiviert',
    category: 'infra',
    order: 20,
    scope: 'project',
    severity: 'critical',

    async audit({ project, runCmd }) {
      const exists = (await runCmd(`test -L /etc/nginx/sites-enabled/${project.domain} && echo yes || echo no`)).trim()
      return {
        passed: exists === 'yes',
        actual: exists === 'yes' ? 'Symlink aktiv' : 'Nicht aktiviert',
        expected: 'Symlink in sites-enabled',
      }
    },

    async enforce({ project, runCmd }) {
      await runCmd(`sudo ln -sf /etc/nginx/sites-available/${project.domain} /etc/nginx/sites-enabled/`)
      await runCmd('sudo nginx -t && sudo systemctl reload nginx')
      return { changed: true }
    },
  },

  {
    id: 'nginx-config-valid',
    name: 'nginx Konfiguration gueltig',
    category: 'infra',
    order: 30,
    scope: 'server',
    severity: 'critical',

    async audit({ runCmd }) {
      const output = await runCmd('sudo nginx -t 2>&1')
      const valid = output.includes('test is successful')
      return {
        passed: valid,
        actual: valid ? 'Konfiguration gueltig' : output.trim(),
        expected: 'nginx -t erfolgreich',
      }
    },
    enforce: null,
  },

  {
    id: 'nginx-security-headers-complete',
    name: 'Alle Security Headers vorhanden',
    category: 'infra',
    order: 40,
    scope: 'project',
    severity: 'high',

    async audit({ project, runCmd }) {
      const config = await runCmd(`cat /etc/nginx/sites-available/${project.domain} 2>/dev/null`)
      if (!config) return { passed: false, actual: 'Config fehlt', expected: 'Alle Headers' }

      const required = [
        'Strict-Transport-Security',
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Referrer-Policy',
        'Permissions-Policy',
      ]
      const missing = required.filter(h => !config.includes(h))
      return {
        passed: missing.length === 0,
        actual: missing.length ? `Fehlend: ${missing.join(', ')}` : 'Alle vorhanden',
        expected: 'Alle 5 Security Headers',
      }
    },

    async enforce({ project, runCmd, writeNginxConfig: writeConfig }) {
      const projectPath = `/home/deploy/apps/${project.name}`
      const config = generateNginxConfig(project.domain, project.port, project.type, projectPath, project)
      await writeConfig(project.domain, config)
      await runCmd('sudo nginx -t && sudo systemctl reload nginx')
      return { changed: true }
    },
  },
]
