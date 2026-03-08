// Express Setup-Rules

export default [
  {
    id: 'express-scaffold',
    name: 'Express Projekt erstellt',
    category: 'setup',
    order: 20,
    scope: 'project',
    severity: 'critical',
    frameworks: ['express-starter'],

    async audit({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}`
      const exists = (await runCmd(`test -f ${path}/package.json && echo yes || echo no`)).trim()
      return {
        passed: exists === 'yes',
        actual: exists === 'yes' ? 'package.json vorhanden' : 'Fehlt',
        expected: 'Express Projekt',
      }
    },

    async enforce({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}`
      const fs = await import('fs')
      const pathMod = await import('path')

      fs.mkdirSync(path, { recursive: true })

      const pkg = {
        name: project.name,
        version: '0.1.0',
        private: true,
        scripts: { start: `node server.js` },
        dependencies: { express: '^4.18.0' },
      }
      fs.writeFileSync(pathMod.join(path, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')

      fs.writeFileSync(pathMod.join(path, 'server.js'),
        `const express = require('express')\nconst app = express()\nconst PORT = ${project.port || 3000}\napp.get('/', (req, res) => res.send('${project.name}'))\napp.listen(PORT, () => console.log(\`Server on port \${PORT}\`))\n`)

      await runCmd(`cd ${path} && bun install`, { timeout: 60000 })
      return { changed: true }
    },
  },
]
