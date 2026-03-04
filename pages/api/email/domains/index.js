// API: E-Mail-Domains auflisten und aktivieren

import { requireAuth } from '../../../../lib/auth'
import { getEmailDomains, addEmailDomain } from '../../../../lib/email/domains'
import { getAccountsByDomain } from '../../../../lib/email/accounts'
import { getAliasesByDomain } from '../../../../lib/email/aliases'
import { regenerateMailConfigs } from '../../../../lib/email/server'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return

  // GET: Alle E-Mail-Domains auflisten
  if (req.method === 'GET') {
    const domains = getEmailDomains().map(d => ({
      ...d,
      accountCount: getAccountsByDomain(d.domain).length,
      aliasCount: getAliasesByDomain(d.domain).length,
    }))
    return res.json({ domains })
  }

  // POST: E-Mail fuer Domain aktivieren
  if (req.method === 'POST') {
    const { domain, groupId } = req.body
    if (!domain) return res.status(400).json({ error: 'Domain ist erforderlich' })
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
      return res.status(400).json({ error: 'Ungueltiges Domain-Format' })
    }

    const entry = addEmailDomain({ domain, groupId })
    if (!entry) return res.status(409).json({ error: 'Domain bereits aktiviert' })

    await regenerateMailConfigs()
    return res.json({ success: true, domain: entry })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
