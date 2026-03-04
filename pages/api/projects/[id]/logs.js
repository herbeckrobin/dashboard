import { requireAuth } from '../../../../lib/auth'
import { getLog } from '../../../../lib/deploy-log'
import { getStepEstimates } from '../../../../lib/deploy-history'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query
  const log = getLog(id)

  if (!log) {
    return res.json({ log: null, estimates: {} })
  }

  const estimates = log.done ? {} : getStepEstimates(id)
  return res.json({ log, estimates })
}
