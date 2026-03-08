// WordPress Setup-Rules (Kern-Operationen)

export default [
  {
    id: 'wp-core-installed',
    name: 'WordPress Core installiert',
    category: 'setup',
    order: 20,
    scope: 'project',
    severity: 'critical',
    frameworks: ['wordpress'],

    async audit({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}`
      const exists = (await runCmd(`test -f ${path}/wp-includes/version.php && echo yes || echo no`)).trim()
      return {
        passed: exists === 'yes',
        actual: exists === 'yes' ? 'Installiert' : 'Fehlt',
        expected: 'WordPress Core vorhanden',
      }
    },

    async enforce({ project, runCmd, escapeShellArg, onOutput }) {
      const path = `/home/deploy/apps/${project.name}`
      await runCmd(`mkdir -p ${escapeShellArg(path)}`)
      await runCmd(`wp core download --path=${escapeShellArg(path)} --locale=de_DE`, { timeout: 60000 })
      return { changed: true }
    },
  },

  {
    id: 'wp-config-exists',
    name: 'wp-config.php vorhanden',
    category: 'setup',
    order: 30,
    scope: 'project',
    severity: 'critical',
    frameworks: ['wordpress'],

    async audit({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}/wp-config.php`
      const exists = (await runCmd(`test -f ${path} && echo yes || echo no`)).trim()
      return {
        passed: exists === 'yes',
        actual: exists === 'yes' ? 'Vorhanden' : 'Fehlt',
        expected: 'wp-config.php',
      }
    },

    async enforce({ project, runCmd, escapeShellArg }) {
      const path = `/home/deploy/apps/${project.name}`
      const db = project.database
      await runCmd(
        `wp config create --path=${escapeShellArg(path)} --dbname=${escapeShellArg(db.name)} --dbuser=${escapeShellArg(db.user)} --dbpass=${escapeShellArg(db.password)} --dbhost=${escapeShellArg(db.host)}`
      )
      return { changed: true }
    },
  },

  {
    id: 'wp-installed',
    name: 'WordPress installiert (Tabellen + Admin)',
    category: 'setup',
    order: 40,
    scope: 'project',
    severity: 'critical',
    frameworks: ['wordpress'],

    async audit({ project, runCmd, escapeShellArg }) {
      const path = `/home/deploy/apps/${project.name}`
      const result = await runCmd(
        `wp option get siteurl --path=${escapeShellArg(path)} 2>/dev/null || echo 'not_installed'`
      )
      return {
        passed: !result.includes('not_installed'),
        actual: result.includes('not_installed') ? 'Nicht installiert' : result.trim(),
        expected: `https://${project.domain}`,
      }
    },

    async enforce({ project, runCmd, escapeShellArg }) {
      const path = `/home/deploy/apps/${project.name}`
      const { randomPassword } = await import('../../install/shared.js')
      const { getAdminEmail } = await import('../../config.js')
      const password = randomPassword()
      await runCmd(
        `wp core install --path=${escapeShellArg(path)} --url=${escapeShellArg('https://' + project.domain)} --title=${escapeShellArg(project.name)} --admin_user=admin --admin_password=${escapeShellArg(password)} --admin_email=${escapeShellArg(getAdminEmail())} --skip-email`
      )
      return { changed: true, meta: { adminPassword: password } }
    },
  },
]
