// PM2 Prozess-Management fuer Node.js Apps

export default [
  {
    id: 'pm2-running',
    name: 'PM2 Prozess laeuft',
    category: 'infra',
    order: 70,
    scope: 'project',
    severity: 'critical',
    frameworks: ['nextjs-starter', 'express-starter'],

    async audit({ project, runCmd }) {
      const output = await runCmd(`pm2 describe ${project.name} 2>/dev/null`)
      const running = output.includes('online')
      return {
        passed: running,
        actual: running ? 'online' : 'nicht gestartet',
        expected: 'PM2 Prozess online',
      }
    },

    async enforce({ project, runCmd }) {
      const projectPath = `/home/deploy/apps/${project.name}`
      const ecosystemExists = (await runCmd(`test -f ${projectPath}/ecosystem.config.js && echo yes || echo no`)).trim()
      if (ecosystemExists === 'yes') {
        await runCmd(`cd ${projectPath} && pm2 start ecosystem.config.js`)
      } else {
        await runCmd(`cd ${projectPath} && pm2 start "bun run start" --name ${project.name}`)
      }
      await runCmd('pm2 save')
      return { changed: true }
    },
  },
]
