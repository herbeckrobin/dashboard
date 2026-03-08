// Contao Setup-Rules

export default [
  {
    id: 'contao-core-installed',
    name: 'Contao Core installiert',
    category: 'setup',
    order: 20,
    scope: 'project',
    severity: 'critical',
    frameworks: ['contao'],

    async audit({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}`
      const exists = (await runCmd(`test -f ${path}/vendor/bin/contao-console && echo yes || echo no`)).trim()
      return {
        passed: exists === 'yes',
        actual: exists === 'yes' ? 'Installiert' : 'Fehlt',
        expected: 'Contao Core vorhanden',
      }
    },

    async enforce({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}`
      await runCmd(`composer config -g audit.block-insecure false`, { timeout: 10000 })
      await runCmd(
        `composer create-project contao/managed-edition ${path} --no-interaction`,
        { timeout: 120000 }
      )
      return { changed: true }
    },
  },

  {
    id: 'contao-permissions',
    name: 'Contao Schreibrechte',
    category: 'setup',
    order: 60,
    scope: 'project',
    severity: 'high',
    frameworks: ['contao'],

    async audit({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}`
      const owner = (await runCmd(`stat -c "%U:%G" ${path}/var 2>/dev/null || echo missing`)).trim()
      return {
        passed: owner.includes('www-data') || owner.includes('deploy'),
        actual: owner,
        expected: 'deploy:www-data mit g+w',
      }
    },

    async enforce({ project, runCmd }) {
      const p = `/home/deploy/apps/${project.name}`
      await runCmd(`sudo chown -R deploy:www-data ${p}`)
      await runCmd(`sudo chmod -R g+w ${p}/var ${p}/files ${p}/assets`)
      await runCmd(`sudo find ${p}/var ${p}/files ${p}/assets -type d -exec chmod g+s {} +`)
      return { changed: true }
    },
  },
]
