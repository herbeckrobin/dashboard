// PM2 Prozess-Management fuer Node.js Apps

export default [
  {
    id: 'pm2-global',
    name: 'PM2 global installiert',
    category: 'infra',
    order: 5,
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      // Mehrere Pfade pruefen (npm global install kann an verschiedenen Orten landen)
      const output = await runCmd('pm2 --version 2>/dev/null || /usr/local/bin/pm2 --version 2>/dev/null || /usr/lib/node_modules/pm2/bin/pm2 --version 2>/dev/null')
      const match = output.match(/\d+\.\d+/)
      return {
        passed: !!match,
        actual: match ? `v${match[0]}` : 'Nicht installiert',
        expected: 'PM2 global installiert',
      }
    },

    async enforce({ runCmd }) {
      await runCmd('sudo npm install -g pm2', { timeout: 60000 })
      await runCmd('sudo env PATH="$PATH:/usr/bin" pm2 startup systemd -u deploy --hp /home/deploy 2>/dev/null || true')
      return { changed: true }
    },
  },

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
