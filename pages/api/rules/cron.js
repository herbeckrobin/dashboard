// Cron-Endpoint: Regelmaessiger Audit + Drift Detection
// Wird alle 6h aufgerufen (via n8n oder externem Cron)
// Pattern wie /api/check-www-dns.js

import { runAudit, getLastAudit } from '../../../lib/rules/index'
import { detectDrift } from '../../../lib/rules/drift'

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Audit durchfuehren
    const audit = await runAudit({ trigger: 'cron' })

    // Drift erkennen
    const drift = detectDrift()

    res.json({
      score: audit.score,
      passed: audit.passed,
      failed: audit.failed,
      totalRules: audit.totalRules,
      drift: {
        drifted: drift.drifted.length,
        newFailures: drift.newFailures.length,
        resolved: drift.resolved.length,
      },
      driftedRules: drift.drifted.map(r => ({
        ruleId: r.ruleId,
        name: r.name,
        severity: r.severity,
        projectName: r.projectName,
      })),
    })
  } catch (err) {
    console.error('[Rules Cron] Fehler:', err.message)
    res.status(500).json({ error: err.message })
  }
}
