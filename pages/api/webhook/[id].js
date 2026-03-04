import { getProject, updateProject } from '../../../lib/db'
import { deployProject } from '../../../lib/deploy'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query
  const project = getProject(id)

  if (!project) {
    return res.status(404).json({ error: 'Projekt nicht gefunden' })
  }

  // Bereits am deployen? Ignorieren
  if (project.status === 'deploying') {
    return res.json({ success: true, message: 'Deploy läuft bereits' })
  }

  const { trigger = 'webhook', triggerInfo = null } = req.body || {}
  const deployStart = Date.now()

  updateProject(id, { status: 'deploying' })

  // Deploy im Hintergrund
  deployProject(project, { trigger, triggerInfo })
    .then(result => {
      const now = new Date().toISOString()
      const durationMs = Date.now() - deployStart
      if (result.success) {
        updateProject(id, {
          status: 'running',
          webhookConfigured: true,
          lastDeploy: { at: now, success: true, trigger, durationMs }
        })
      } else {
        updateProject(id, {
          status: 'error',
          error: result.error,
          lastDeploy: { at: now, success: false, trigger, error: result.error }
        })
      }
    })
    .catch(err => {
      updateProject(id, {
        status: 'error',
        error: err.message,
        lastDeploy: { at: new Date().toISOString(), success: false, trigger, error: err.message }
      })
    })

  res.json({ success: true, message: 'Webhook Deploy gestartet' })
}
