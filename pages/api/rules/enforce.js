// API: Rules enforcen (einzeln oder alle) + Status-Abfrage

import { requireAuth } from '../../../lib/auth'
import { enforceRule, enforceAll, getEnforceStatus } from '../../../lib/rules/index'

export default async function handler(req, res) {
  const authed = await requireAuth(req, res)
  if (!authed) return

  // GET: Enforce-Status abfragen (fuer Bootstrap-Fortschritt)
  if (req.method === 'GET') {
    return res.json({ status: getEnforceStatus() })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { ruleId, projectId, enforceAll: doEnforceAll, categories } = req.body || {}

  try {
    if (doEnforceAll) {
      // Alle fehlgeschlagenen enforceable Rules fixen
      const result = await enforceAll({ projectId, categories })
      return res.json(result)
    }

    if (ruleId) {
      // Einzelne Rule enforcen
      const result = await enforceRule(ruleId, projectId)
      if (result.error) {
        return res.status(400).json({ error: result.error })
      }
      return res.json(result)
    }

    return res.status(400).json({ error: 'ruleId oder enforceAll erforderlich' })
  } catch (err) {
    console.error('[Rules] Enforce fehlgeschlagen:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
