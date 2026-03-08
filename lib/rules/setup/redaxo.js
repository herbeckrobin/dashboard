// Redaxo Setup-Rules

export default [
  {
    id: 'redaxo-core-installed',
    name: 'Redaxo Core installiert',
    category: 'setup',
    order: 20,
    scope: 'project',
    severity: 'critical',
    frameworks: ['redaxo'],

    async audit({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}`
      const exists = (await runCmd(`test -f ${path}/redaxo/src/core/boot.php && echo yes || echo no`)).trim()
      return {
        passed: exists === 'yes',
        actual: exists === 'yes' ? 'Installiert' : 'Fehlt',
        expected: 'Redaxo Core vorhanden',
      }
    },

    async enforce({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}`
      await runCmd(`mkdir -p ${path}`)
      await runCmd(
        `curl -sL $(curl -s https://api.github.com/repos/redaxo/redaxo/releases/latest | grep browser_download_url | grep ".zip" | head -1 | cut -d'"' -f4) -o /tmp/redaxo.zip && cd ${path} && unzip -qo /tmp/redaxo.zip && rm /tmp/redaxo.zip`,
        { timeout: 60000 }
      )
      return { changed: true }
    },
  },

  {
    id: 'redaxo-permissions',
    name: 'Redaxo Schreibrechte',
    category: 'setup',
    order: 60,
    scope: 'project',
    severity: 'high',
    frameworks: ['redaxo'],

    async audit({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}`
      const owner = (await runCmd(`stat -c "%U:%G" ${path}/redaxo/data 2>/dev/null || echo missing`)).trim()
      return {
        passed: owner.includes('www-data') || owner.includes('deploy'),
        actual: owner,
        expected: 'deploy:www-data mit g+w',
      }
    },

    async enforce({ project, runCmd }) {
      const p = `/home/deploy/apps/${project.name}`
      await runCmd(`mkdir -p ${p}/media ${p}/assets ${p}/redaxo/cache`)
      await runCmd(`sudo chown -R deploy:www-data ${p}`)
      await runCmd(`sudo chmod -R g+w ${p}/redaxo/data ${p}/redaxo/cache ${p}/redaxo/src ${p}/media ${p}/assets`)
      await runCmd(`sudo find ${p}/redaxo/data ${p}/redaxo/cache ${p}/redaxo/src ${p}/media ${p}/assets -type d -exec chmod g+s {} +`)
      return { changed: true }
    },
  },
]
