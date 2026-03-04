// API: DKIM-Key fuer Domain generieren

import { requireAuth } from '../../../../../lib/auth'
import { getEmailDomain } from '../../../../../lib/email/domains'
import { generateDkim } from '../../../../../lib/email/dkim'
import { regenerateMailConfigs } from '../../../../../lib/email/server'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return

  const { domain } = req.query
  const emailDomain = getEmailDomain(domain)
  if (!emailDomain) return res.status(404).json({ error: 'Domain nicht gefunden' })

  if (req.method === 'POST') {
    const result = await generateDkim(domain)
    if (!result.success) {
      return res.status(500).json({ error: result.error })
    }
    await regenerateMailConfigs()
    return res.json({ success: true, publicKey: result.publicKey, selector: result.selector })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
