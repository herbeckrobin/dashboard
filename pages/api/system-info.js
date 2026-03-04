import { requireAuth } from '../../lib/auth'
import { getSystemInfo } from '../../lib/system-info'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    res.json(await getSystemInfo())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
