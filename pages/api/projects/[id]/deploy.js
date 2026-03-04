import { requireAuth } from '../../../../lib/auth'
import { getProject, updateProject } from '../../../../lib/db'
import { deployProject } from '../../../../lib/deploy'
import { runPerformanceCheck } from '../../../../lib/performance'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query
  const project = getProject(id)

  if (!project) {
    return res.status(404).json({ error: 'Projekt nicht gefunden' })
  }

  const { trigger = 'manual', triggerInfo = null } = req.body || {}
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
          lastDeploy: { at: now, success: true, trigger, durationMs, ...(result.aiCostUsd ? { aiCostUsd: result.aiCostUsd } : {}) }
        })

        // Performance-Check nach erfolgreichem Deploy (10s Delay fuer App-Start)
        if (project.domain) {
          setTimeout(() => {
            runPerformanceCheck(project, 'deploy').catch(err => {
              console.error('Post-deploy performance check error:', err.message)
            })
          }, 10000)
        }
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

  res.json({ success: true, message: 'Deploy gestartet' })
}
