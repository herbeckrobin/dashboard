// Git Setup-Rules

export default [
  {
    id: 'git-initialized',
    name: 'Git Repository initialisiert',
    category: 'setup',
    order: 80,
    scope: 'project',
    severity: 'high',

    async audit({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}`
      const exists = (await runCmd(`test -d ${path}/.git && echo yes || echo no`)).trim()
      return {
        passed: exists === 'yes',
        actual: exists === 'yes' ? 'Git initialisiert' : 'Kein Git',
        expected: '.git Verzeichnis',
      }
    },

    async enforce({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}`
      const { getGitConf } = await import('../../install/shared.js')
      await runCmd(`cd ${path} && git init -b main && git add -A && git ${getGitConf()} commit -m "Initial commit"`)
      return { changed: true }
    },
  },

  {
    id: 'git-remote-set',
    name: 'Git Remote konfiguriert',
    category: 'setup',
    order: 81,
    scope: 'project',
    severity: 'high',

    async audit({ project, runCmd }) {
      if (!project.repo) return { passed: true, actual: 'Kein Repo konfiguriert', expected: '-' }
      const path = `/home/deploy/apps/${project.name}`
      const remote = (await runCmd(`cd ${path} && git remote get-url origin 2>/dev/null || echo 'none'`)).trim()
      return {
        passed: remote !== 'none',
        actual: remote !== 'none' ? 'Remote gesetzt' : 'Kein Remote',
        expected: 'origin Remote',
      }
    },

    async enforce({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}`
      const { getGitUrl } = await import('../../install/shared.js')
      const gitUrl = getGitUrl(project.repo)
      // Remote setzen oder aktualisieren
      await runCmd(`cd ${path} && (git remote set-url origin ${gitUrl} 2>/dev/null || git remote add origin ${gitUrl})`)
      return { changed: true }
    },
  },
]
