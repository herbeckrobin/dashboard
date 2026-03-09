// Dashboard Self-Update: Versions-Info, Step-by-Step Update mit Fortschritt
import { requireAuth } from '../../lib/auth'
import { runCommand, runCommandLive } from '../../lib/run-command'

const DASHBOARD_DIR = '/home/deploy/apps/admin-dashboard'
const BUN = '/home/deploy/.bun/bin/bun'

// In-Memory Update-Status (wie Rules Audit Pattern)
let updateStatus = null

export function getUpdateStatus() {
  return updateStatus
}

// Versions-Info: aktueller Commit, verfuegbare Updates, Changelog
async function getVersionInfo() {
  const [currentResult] = await Promise.all([
    runCommand(`cd ${DASHBOARD_DIR} && git log -1 --format="%H|%h|%s|%ai"`),
    runCommand(`cd ${DASHBOARD_DIR} && git fetch origin main 2>&1`)
  ])

  if (!currentResult.success) {
    return { error: 'Git-Info nicht verfuegbar' }
  }

  const [hash, shortHash, message, date] = currentResult.output.split('|')
  const current = { hash, shortHash, message, date }

  // Pruefen ob Updates verfuegbar sind
  const behindResult = await runCommand(
    `cd ${DASHBOARD_DIR} && git rev-list --count HEAD..origin/main`
  )
  const updatesAvailable = behindResult.success ? parseInt(behindResult.output) || 0 : 0

  let changelog = []
  if (updatesAvailable > 0) {
    const logResult = await runCommand(
      `cd ${DASHBOARD_DIR} && git log --format="%h|%s|%ai" HEAD..origin/main`
    )
    if (logResult.success && logResult.output) {
      changelog = logResult.output.split('\n').map(line => {
        const [commitHash, commitMessage, commitDate] = line.split('|')
        return { hash: commitHash, message: commitMessage, date: commitDate }
      })
    }
  }

  return { current, updatesAvailable, changelog }
}

// Update-Steps ausfuehren mit Fortschritt-Tracking
async function runUpdate() {
  const steps = [
    { name: 'pull', label: 'Code aktualisieren', cmd: `cd ${DASHBOARD_DIR} && git pull origin main` },
    { name: 'install', label: 'Dependencies installieren', cmd: `cd ${DASHBOARD_DIR} && ${BUN} install` },
    { name: 'build', label: 'Dashboard bauen', cmd: `cd ${DASHBOARD_DIR} && ${BUN} run build`, timeout: 600000 },
    { name: 'restart', label: 'Service neustarten', cmd: 'sudo systemctl restart admin-dashboard' }
  ]

  updateStatus = {
    status: 'running',
    startedAt: new Date().toISOString(),
    steps: steps.map(s => ({ name: s.name, label: s.label, status: 'pending', output: '' })),
    currentStep: 0,
    error: null
  }

  for (let i = 0; i < steps.length; i++) {
    updateStatus.currentStep = i
    updateStatus.steps[i].status = 'running'
    updateStatus.steps[i].startedAt = new Date().toISOString()

    const result = await runCommandLive(
      steps[i].cmd,
      steps[i].timeout || 300000,
      (output) => { updateStatus.steps[i].liveOutput = output }
    )

    updateStatus.steps[i].finishedAt = new Date().toISOString()

    if (result.success) {
      updateStatus.steps[i].status = 'done'
      updateStatus.steps[i].output = result.output || ''
    } else {
      updateStatus.steps[i].status = 'error'
      updateStatus.steps[i].output = result.error || result.output || ''
      updateStatus.error = `Schritt "${steps[i].label}" fehlgeschlagen`
      updateStatus.status = 'error'
      updateStatus.finishedAt = new Date().toISOString()
      return
    }
  }

  updateStatus.status = 'done'
  updateStatus.finishedAt = new Date().toISOString()
}

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return

  // GET: Versions-Info oder Update-Status
  if (req.method === 'GET') {
    if (req.query.status === 'true') {
      return res.json({ status: updateStatus })
    }
    try {
      const info = await getVersionInfo()
      return res.json(info)
    } catch (err) {
      return res.status(500).json({ error: 'Versions-Info nicht verfuegbar' })
    }
  }

  // POST: Update starten
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Laeuft bereits?
  if (updateStatus?.status === 'running') {
    return res.status(409).json({ error: 'Update laeuft bereits' })
  }

  // Sofort antworten, Update laeuft im Hintergrund
  res.json({ success: true, message: 'Update gestartet' })

  try {
    await runUpdate()
  } catch (err) {
    console.error('Dashboard-Update fehlgeschlagen:', err.message)
    if (updateStatus) {
      updateStatus.status = 'error'
      updateStatus.error = err.message
      updateStatus.finishedAt = new Date().toISOString()
    }
  }
}
