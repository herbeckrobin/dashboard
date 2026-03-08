// Dateiberechtigungen — Server- und Projekt-Ebene

export default [
  // --- Server-Ebene ---

  {
    id: 'data-dir-permissions',
    name: 'data/ Verzeichnis-Berechtigungen',
    category: 'security',
    scope: 'server',
    severity: 'critical',

    async audit({ runCmd }) {
      const perms = (await runCmd('stat -c "%a" /home/deploy/apps/admin-dashboard/data 2>/dev/null')).trim()
      return {
        passed: perms === '700',
        actual: perms || 'Verzeichnis nicht gefunden',
        expected: '700',
      }
    },

    async enforce({ runCmd }) {
      await runCmd('chmod 700 /home/deploy/apps/admin-dashboard/data')
      return { changed: true }
    },
  },

  {
    id: 'auth-json-permissions',
    name: 'auth.json Berechtigungen',
    category: 'security',
    scope: 'server',
    severity: 'critical',

    async audit({ runCmd }) {
      const perms = (await runCmd('stat -c "%a" /home/deploy/apps/admin-dashboard/data/auth.json 2>/dev/null')).trim()
      if (!perms) return { passed: true, actual: 'Datei nicht vorhanden', expected: '600' }
      return {
        passed: perms === '600',
        actual: perms,
        expected: '600',
      }
    },

    async enforce({ runCmd }) {
      await runCmd('chmod 600 /home/deploy/apps/admin-dashboard/data/auth.json')
      return { changed: true }
    },
  },

  {
    id: 'config-json-permissions',
    name: 'config.json Berechtigungen',
    category: 'security',
    scope: 'server',
    severity: 'critical',

    async audit({ runCmd }) {
      const perms = (await runCmd('stat -c "%a" /home/deploy/apps/admin-dashboard/data/config.json 2>/dev/null')).trim()
      if (!perms) return { passed: true, actual: 'Datei nicht vorhanden', expected: '600' }
      return {
        passed: perms === '600',
        actual: perms,
        expected: '600',
      }
    },

    async enforce({ runCmd }) {
      await runCmd('chmod 600 /home/deploy/apps/admin-dashboard/data/config.json')
      return { changed: true }
    },
  },

  {
    id: 'projects-json-permissions',
    name: 'projects.json Berechtigungen',
    category: 'security',
    scope: 'server',
    severity: 'critical',

    async audit({ runCmd }) {
      const perms = (await runCmd('stat -c "%a" /home/deploy/apps/admin-dashboard/data/projects.json 2>/dev/null')).trim()
      if (!perms) return { passed: true, actual: 'Datei nicht vorhanden', expected: '600' }
      return {
        passed: perms === '600',
        actual: perms,
        expected: '600',
      }
    },

    async enforce({ runCmd }) {
      await runCmd('chmod 600 /home/deploy/apps/admin-dashboard/data/projects.json')
      return { changed: true }
    },
  },

  // --- Projekt-Ebene ---

  {
    id: 'env-file-permissions',
    name: '.env Berechtigungen',
    category: 'security',
    scope: 'project',
    severity: 'high',

    async audit({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}/.env`
      const exists = (await runCmd(`test -f ${path} && echo yes || echo no`)).trim()
      if (exists !== 'yes') return { passed: true, actual: 'Keine .env vorhanden', expected: '600' }
      const perms = (await runCmd(`stat -c "%a" ${path}`)).trim()
      return {
        passed: perms === '600',
        actual: perms,
        expected: '600',
      }
    },

    async enforce({ project, runCmd }) {
      await runCmd(`chmod 600 /home/deploy/apps/${project.name}/.env`)
      return { changed: true }
    },
  },

  {
    id: 'wp-config-permissions',
    name: 'wp-config.php Berechtigungen',
    category: 'security',
    scope: 'project',
    severity: 'high',
    frameworks: ['wordpress'],

    async audit({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}/wp-config.php`
      const exists = (await runCmd(`test -f ${path} && echo yes || echo no`)).trim()
      if (exists !== 'yes') return { passed: true, actual: 'Datei nicht vorhanden', expected: '640' }
      const perms = (await runCmd(`stat -c "%a" ${path}`)).trim()
      return {
        passed: perms === '640',
        actual: perms,
        expected: '640',
      }
    },

    async enforce({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}/wp-config.php`
      await runCmd(`chmod 640 ${path} && chown deploy:www-data ${path}`)
      return { changed: true }
    },
  },

  {
    id: 'project-ownership',
    name: 'Projekt-Verzeichnis Ownership',
    category: 'security',
    scope: 'project',
    severity: 'high',

    async audit({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}`
      const exists = (await runCmd(`test -d ${path} && echo yes || echo no`)).trim()
      if (exists !== 'yes') return { passed: true, actual: 'Verzeichnis nicht vorhanden', expected: 'deploy:www-data' }
      const owner = (await runCmd(`stat -c "%U:%G" ${path}`)).trim()
      return {
        passed: owner === 'deploy:www-data' || owner === 'deploy:deploy',
        actual: owner,
        expected: 'deploy:www-data',
      }
    },

    async enforce({ project, runCmd }) {
      await runCmd(`sudo chown deploy:www-data /home/deploy/apps/${project.name}`)
      return { changed: true }
    },
  },

  {
    id: 'wp-uploads-ownership',
    name: 'WordPress Uploads Ownership',
    category: 'security',
    scope: 'project',
    severity: 'high',
    frameworks: ['wordpress'],

    async audit({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}/wp-content/uploads`
      const exists = (await runCmd(`test -d ${path} && echo yes || echo no`)).trim()
      if (exists !== 'yes') return { passed: true, actual: 'Verzeichnis nicht vorhanden', expected: 'www-data:www-data' }
      const owner = (await runCmd(`stat -c "%U:%G" ${path}`)).trim()
      return {
        passed: owner === 'www-data:www-data',
        actual: owner,
        expected: 'www-data:www-data',
      }
    },

    async enforce({ project, runCmd }) {
      await runCmd(`sudo chown -R www-data:www-data /home/deploy/apps/${project.name}/wp-content/uploads`)
      return { changed: true }
    },
  },
]
