// API: DNS-Records und Status fuer E-Mail-Domain

import { requireAuth } from '../../../../../lib/auth'
import { getEmailDomain } from '../../../../../lib/email/domains'
import { getDnsRecords } from '../../../../../lib/email/dkim'
import { checkEmailDns } from '../../../../../lib/email/dns-helper'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return

  const { domain } = req.query
  const emailDomain = getEmailDomain(domain)
  if (!emailDomain) return res.status(404).json({ error: 'Domain nicht gefunden' })

  if (req.method === 'GET') {
    const records = getDnsRecords(domain)
    const status = await checkEmailDns(domain)
    return res.json({ records, status })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
