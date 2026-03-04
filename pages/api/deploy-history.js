import { requireAuth } from '../../lib/auth'
import { getHistory } from '../../lib/deploy-history'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const { projectId, limit } = req.query
  const deploys = getHistory(parseInt(limit) || 50, projectId || null)
  res.json({ deploys })
}
