// API: Mail-Queue Verwaltung

import { requireAuth } from '../../../lib/auth'
import { getMailQueue, flushMailQueue, deleteFromQueue } from '../../../lib/email/server'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return

  // GET: Queue anzeigen
  if (req.method === 'GET') {
    const queue = await getMailQueue()
    return res.json({ queue, count: queue.length })
  }

  // POST: Queue flushen (alle Mails erneut versuchen)
  if (req.method === 'POST') {
    const result = await flushMailQueue()
    return res.json({ success: result.success })
  }

  // DELETE: Einzelne Mail aus Queue loeschen
  if (req.method === 'DELETE') {
    const { queueId } = req.body
    if (!queueId) return res.status(400).json({ error: 'Queue-ID erforderlich' })

    const result = await deleteFromQueue(queueId)
    return res.json({ success: result.success })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
