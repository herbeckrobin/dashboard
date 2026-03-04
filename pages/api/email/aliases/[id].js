// API: Alias loeschen

import { requireAuth } from '../../../../lib/auth'
import { deleteAlias } from '../../../../lib/email/aliases'
import { regenerateMailConfigs } from '../../../../lib/email/server'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return

  const { id } = req.query

  if (req.method === 'DELETE') {
    const deleted = deleteAlias(id)
    if (!deleted) return res.status(404).json({ error: 'Alias nicht gefunden' })

    await regenerateMailConfigs()
    return res.json({ success: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
