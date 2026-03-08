// Laravel Setup-Rules

export default [
  {
    id: 'laravel-core-installed',
    name: 'Laravel Core installiert',
    category: 'setup',
    order: 20,
    scope: 'project',
    severity: 'critical',
    frameworks: ['laravel'],

    async audit({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}`
      const exists = (await runCmd(`test -f ${path}/artisan && echo yes || echo no`)).trim()
      return {
        passed: exists === 'yes',
        actual: exists === 'yes' ? 'Installiert' : 'Fehlt',
        expected: 'Laravel Core vorhanden',
      }
    },

    async enforce({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}`
      await runCmd(
        `composer create-project laravel/laravel ${path} --no-interaction`,
        { timeout: 120000 }
      )
      return { changed: true }
    },
  },

  {
    id: 'laravel-env-configured',
    name: 'Laravel .env konfiguriert',
    category: 'setup',
    order: 30,
    scope: 'project',
    severity: 'critical',
    frameworks: ['laravel'],

    async audit({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}/.env`
      const exists = (await runCmd(`test -f ${path} && echo yes || echo no`)).trim()
      if (exists !== 'yes') return { passed: false, actual: 'Fehlt', expected: '.env vorhanden' }
      // Pruefen ob DB konfiguriert
      const hasDb = (await runCmd(`grep -c "DB_DATABASE=" ${path} 2>/dev/null`)).trim()
      return {
        passed: parseInt(hasDb) > 0,
        actual: parseInt(hasDb) > 0 ? '.env mit DB-Config' : '.env ohne DB-Config',
        expected: '.env mit Datenbank-Konfiguration',
      }
    },

    async enforce({ project, runCmd }) {
      const p = `/home/deploy/apps/${project.name}`
      const db = project.database
      // .env.example kopieren und DB-Daten setzen
      await runCmd(`cd ${p} && cp .env.example .env 2>/dev/null; true`)
      await runCmd(`cd ${p} && sed -i "s/^DB_DATABASE=.*/DB_DATABASE=${db.name}/" .env`)
      await runCmd(`cd ${p} && sed -i "s/^DB_USERNAME=.*/DB_USERNAME=${db.user}/" .env`)
      await runCmd(`cd ${p} && sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=${db.password}/" .env`)
      await runCmd(`cd ${p} && php artisan key:generate`)
      return { changed: true }
    },
  },

  {
    id: 'laravel-permissions',
    name: 'Laravel Schreibrechte',
    category: 'setup',
    order: 60,
    scope: 'project',
    severity: 'high',
    frameworks: ['laravel'],

    async audit({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}`
      const storagePerms = (await runCmd(`stat -c "%a" ${path}/storage 2>/dev/null || echo 0`)).trim()
      return {
        passed: storagePerms === '777' || storagePerms === '775',
        actual: `storage: ${storagePerms}`,
        expected: 'storage: 777',
      }
    },

    async enforce({ project, runCmd }) {
      const p = `/home/deploy/apps/${project.name}`
      await runCmd(`chmod -R 777 ${p}/storage ${p}/bootstrap/cache`)
      return { changed: true }
    },
  },
]
