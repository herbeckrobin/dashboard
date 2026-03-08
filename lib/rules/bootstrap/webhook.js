// Webhook-Server — empfaengt Gitea Push Events und triggert Deploys

import fs from 'fs'
import path from 'path'

// Webhook-Server Code als Template
const WEBHOOK_SERVER_CODE = `import express from 'express'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 9000
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

// Body als raw Buffer fuer Signatur-Check
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf } }))

function verifySignature(req) {
  const sig = req.headers['x-gitea-signature'] || req.headers['x-hub-signature-256'] || ''
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET)
  hmac.update(req.rawBody)
  const expected = hmac.digest('hex')
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
}

function getProjects() {
  try {
    const data = JSON.parse(fs.readFileSync('/home/deploy/apps/admin-dashboard/data/projects.json', 'utf8'))
    return data.projects || []
  } catch { return [] }
}

app.post('/webhook', (req, res) => {
  // Signatur pruefen
  try {
    if (!verifySignature(req)) {
      console.log('[WARN] Ungueltige Signatur')
      return res.status(401).json({ error: 'Invalid signature' })
    }
  } catch (err) {
    console.log('[WARN] Signatur-Check fehlgeschlagen:', err.message)
    return res.status(401).json({ error: 'Signature check failed' })
  }

  const repoUrl = req.body?.repository?.clone_url || req.body?.repository?.html_url || ''
  const repoName = req.body?.repository?.name || ''
  console.log('[PUSH]', repoName, repoUrl)

  // Projekt anhand Repo-URL finden
  const projects = getProjects()
  const project = projects.find(p =>
    p.gitUrl === repoUrl ||
    p.gitUrl === repoUrl.replace('.git', '') ||
    p.gitUrl + '.git' === repoUrl
  )

  if (!project) {
    console.log('[SKIP] Kein Projekt fuer', repoUrl)
    return res.json({ status: 'skipped', reason: 'no matching project' })
  }

  // Deploy triggern
  console.log('[DEPLOY]', project.name, project.id)
  fetch(\`http://127.0.0.1:3005/api/projects/\${project.id}/deploy\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }).catch(err => console.error('[ERROR] Deploy-Trigger:', err.message))

  res.json({ status: 'triggered', project: project.name })
})

app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`[OK] Webhook-Server laeuft auf Port \${PORT}\`)
})
`

const WEBHOOK_SERVICE = `[Unit]
Description=Webhook Server
After=network.target admin-dashboard.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/home/deploy/webhook
ExecStart=/usr/bin/node /home/deploy/webhook/webhook-server.js
Restart=always
RestartSec=5
EnvironmentFile=/home/deploy/webhook/.env

[Install]
WantedBy=multi-user.target
`

export default [
  {
    id: 'webhook-server-running',
    name: 'Webhook-Server laeuft',
    category: 'bootstrap',
    order: 70,
    scope: 'server',
    severity: 'high',

    async audit({ runQuick, runCmd }) {
      const status = (await runQuick('systemctl is-active webhook-server')).trim()
      const fileExists = (await runQuick('test -f /home/deploy/webhook/webhook-server.js && echo yes || echo no')).trim()
      return {
        passed: status === 'active' && fileExists === 'yes',
        actual: status === 'active' ? 'Service aktiv' : (fileExists === 'yes' ? 'Installiert, nicht aktiv' : 'Nicht installiert'),
        expected: 'Webhook-Server aktiv',
      }
    },

    async enforce({ runCmd }) {
      // Verzeichnis erstellen
      await runCmd('mkdir -p /home/deploy/webhook')

      // webhook-server.js schreiben
      const tmpJs = '/tmp/webhook-server.js'
      fs.writeFileSync(tmpJs, WEBHOOK_SERVER_CODE)
      await runCmd(`mv ${tmpJs} /home/deploy/webhook/webhook-server.js`)

      // package.json + Abhaengigkeiten
      await runCmd('cd /home/deploy/webhook && npm init -y 2>/dev/null || true')
      // ESM aktivieren
      await runCmd("cd /home/deploy/webhook && node -e \"const p=require('./package.json'); p.type='module'; require('fs').writeFileSync('package.json', JSON.stringify(p, null, 2))\"")
      await runCmd('cd /home/deploy/webhook && npm install express', { timeout: 30000 })

      // .env mit WEBHOOK_SECRET aus Dashboard
      const dashboardEnv = await runCmd('cat /home/deploy/apps/admin-dashboard/.env 2>/dev/null')
      const secretMatch = dashboardEnv.match(/WEBHOOK_SECRET=(.+)/)
      const secret = secretMatch ? secretMatch[1].trim() : ''
      if (secret) {
        const tmpEnv = '/tmp/webhook-env'
        fs.writeFileSync(tmpEnv, `WEBHOOK_SECRET=${secret}\n`)
        await runCmd(`mv ${tmpEnv} /home/deploy/webhook/.env`)
        await runCmd('chmod 600 /home/deploy/webhook/.env')
      }

      // Berechtigungen
      await runCmd('chown -R deploy:deploy /home/deploy/webhook')
      await runCmd('chmod 640 /home/deploy/webhook/webhook-server.js')

      // systemd Service
      const tmpService = '/tmp/webhook-server.service'
      fs.writeFileSync(tmpService, WEBHOOK_SERVICE)
      await runCmd(`sudo mv ${tmpService} /etc/systemd/system/webhook-server.service`)
      await runCmd('sudo systemctl daemon-reload')
      await runCmd('sudo systemctl enable webhook-server')
      await runCmd('sudo systemctl start webhook-server')

      return { changed: true }
    },
  },
]
