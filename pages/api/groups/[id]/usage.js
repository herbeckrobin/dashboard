import { requireAuth } from '../../../../lib/auth'
import { getGroupUsage } from '../../../../lib/limits'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query
  const usage = await getGroupUsage(id)
  if (!usage) return res.status(404).json({ error: 'Gruppe nicht gefunden' })

  return res.json({ usage })
}
