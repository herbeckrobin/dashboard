// API: Security/Rules Audit starten und abrufen

import { requireAuth } from '../../../lib/auth'
import { runAudit, getAuditStatus, getLastAudit } from '../../../lib/rules/index'

export default async function handler(req, res) {
  const authed = await requireAuth(req, res)
  if (!authed) return

  if (req.method === 'GET') {
    // Status oder letzten Audit abrufen
    if (req.query.status === 'true') {
      return res.json({ status: getAuditStatus() })
    }
    const lastAudit = getLastAudit()
    return res.json({ audit: lastAudit })
  }

  if (req.method === 'POST') {
    const { projectId, categories, trigger } = req.body || {}

    // Pruefen ob schon ein Audit laeuft
    const status = getAuditStatus()
    if (status?.status === 'running') {
      return res.status(409).json({ error: 'Audit laeuft bereits' })
    }

    // Audit async starten (sofort antworten)
    res.json({ started: true, message: 'Audit gestartet' })

    try {
      await runAudit({ projectId, categories, trigger: trigger || 'manual' })
    } catch (err) {
      console.error('[Rules] Audit fehlgeschlagen:', err.message)
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
