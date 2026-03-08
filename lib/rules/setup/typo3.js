// TYPO3 Setup-Rules

export default [
  {
    id: 'typo3-core-installed',
    name: 'TYPO3 Core installiert',
    category: 'setup',
    order: 20,
    scope: 'project',
    severity: 'critical',
    frameworks: ['typo3'],

    async audit({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}`
      const exists = (await runCmd(`test -f ${path}/vendor/bin/typo3 && echo yes || echo no`)).trim()
      return {
        passed: exists === 'yes',
        actual: exists === 'yes' ? 'Installiert' : 'Fehlt',
        expected: 'TYPO3 Core vorhanden',
      }
    },

    async enforce({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}`
      await runCmd(
        `composer create-project typo3/cms-base-distribution:^13 ${path} --no-interaction`,
        { timeout: 120000 }
      )
      return { changed: true }
    },
  },

  {
    id: 'typo3-permissions',
    name: 'TYPO3 Schreibrechte',
    category: 'setup',
    order: 60,
    scope: 'project',
    severity: 'high',
    frameworks: ['typo3'],

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
      await runCmd(`sudo chmod -R g+w ${p}/var ${p}/config ${p}/public/fileadmin ${p}/public/typo3temp`)
      await runCmd(`sudo find ${p}/var ${p}/config ${p}/public/fileadmin ${p}/public/typo3temp -type d -exec chmod g+s {} +`)
      return { changed: true }
    },
  },
]
