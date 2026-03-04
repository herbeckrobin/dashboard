import { requireAuth } from '../../../../lib/auth'
import { getProject } from '../../../../lib/db'
import { getPerformanceHistory, getLatestScore, runPerformanceCheck, getCheckStatus } from '../../../../lib/performance'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return
  const { id } = req.query

  const project = getProject(id)
  if (!project) {
    return res.status(404).json({ error: 'Projekt nicht gefunden' })
  }

  if (req.method === 'GET') {
    const limit = parseInt(req.query.limit) || 10
    const history = getPerformanceHistory(id, limit)
    const latest = getLatestScore(id)
    const status = getCheckStatus(id)
    return res.json({ history, latest, status })
  }

  if (req.method === 'POST') {
    if (project.performanceCheckEnabled === false) {
      return res.status(400).json({ error: 'Performance-Monitoring ist fuer dieses Projekt deaktiviert' })
    }

    const status = getCheckStatus(id)
    if (status && status.status === 'checking') {
      return res.status(409).json({ error: 'Check läuft bereits' })
    }

    if (!project.domain) {
      return res.status(400).json({ error: 'Kein Domain konfiguriert' })
    }

    const { trigger = 'manual' } = req.body || {}

    // Async ausfuehren (fire-and-forget)
    runPerformanceCheck(project, trigger).catch(err => {
      console.error('Performance check error:', err.message)
    })

    return res.json({ success: true, message: 'Performance-Check gestartet' })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
