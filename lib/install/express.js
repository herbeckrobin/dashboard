// Express Starter Install-Steps

import { runCommand } from '../run-command'
import { generateStarterContent } from '../ai-generate'
import { getGitUrl, GIT_CONF } from './shared'

function getAiStep(project) {
  if (!project.aiDescription) return null
  return {
    name: 'AI Starter Content generieren',
    run: async () => {
      try {
        const result = await generateStarterContent(project)
        if (!result.success) {
          return { success: true, costUsd: result.costUsd, output: `AI uebersprungen: ${result.error}` }
        }
        return result
      } catch (err) {
        return { success: true, output: `AI uebersprungen: ${err.message}` }
      }
    }
  }
}

export function getExpressStarterSteps(project) {
  const { name } = project
  const projectPath = `/home/deploy/apps/${name}`
  const gitUrl = getGitUrl(project.repo)
  const port = project.port
  const steps = []

  // 1. Express Starter erstellen
  steps.push({
    name: 'Express Starter erstellen',
    run: async () => {
      const fs = await import('fs')

      const initResult = await runCommand(`sudo rm -rf ${projectPath} && mkdir -p ${projectPath} && cd ${projectPath} && bun init -y && bun add express`)
      if (!initResult.success) return initResult

      const indexJs = `const express = require('express')
const app = express()
const PORT = process.env.PORT || ${port}

app.get('/', (req, res) => {
  res.json({ message: 'Express Server laeuft!' })
})

app.listen(PORT, () => {
  console.log(\`Server laeuft auf Port \${PORT}\`)
})
`
      const tmpPath = `/tmp/express-index-${name}.js`
      fs.writeFileSync(tmpPath, indexJs)
      const mvResult = await runCommand(`mv ${tmpPath} ${projectPath}/index.js`)
      if (!mvResult.success) return mvResult

      const pkgResult = await runCommand(`cd ${projectPath} && bun -e "const p=require('./package.json'); p.scripts.start='node index.js'; require('fs').writeFileSync('package.json', JSON.stringify(p, null, 2))"`)
      if (!pkgResult.success) return pkgResult

      fs.writeFileSync(`${projectPath}/.gitignore`, 'node_modules/\n')
      return { success: true, output: 'Express Starter erstellt' }
    }
  })

  // 2. AI Starter Content (optional)
  const expressAiStep = getAiStep(project)
  if (expressAiStep) steps.push(expressAiStep)

  // 3. Git Push
  steps.push({
    name: 'Git Push (Express)',
    cmd: `cd ${projectPath} && git init -b main && git add -A && git ${GIT_CONF} commit -m "Express Starter" && git remote add origin ${gitUrl} && git push -u origin main --force`
  })

  return { steps, info: { note: 'Express Starter ist bereit' } }
}
