// API: E-Mail-Domain Details, Update, Delete

import { requireAuth } from '../../../../../lib/auth'
import { getEmailDomain, updateEmailDomain, deleteEmailDomain } from '../../../../../lib/email/domains'
import { getAccountsByDomain, deleteAccount } from '../../../../../lib/email/accounts'
import { getAliasesByDomain, deleteAlias } from '../../../../../lib/email/aliases'
import { regenerateMailConfigs, getMailboxSize } from '../../../../../lib/email/server'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return

  const { domain } = req.query
  const emailDomain = getEmailDomain(domain)
  if (!emailDomain) return res.status(404).json({ error: 'Domain nicht gefunden' })

  // GET: Domain-Details mit Konten und Aliases
  if (req.method === 'GET') {
    const accounts = getAccountsByDomain(domain)
    const accountsWithSize = await Promise.all(
      accounts.map(async (a) => ({
        ...a,
        usedBytes: await getMailboxSize(a.domain, a.local)
      }))
    )
    const aliases = getAliasesByDomain(domain)
    return res.json({ domain: emailDomain, accounts: accountsWithSize, aliases })
  }

  // PUT: Domain-Einstellungen aktualisieren
  if (req.method === 'PUT') {
    const { catchAll, enabled } = req.body
    const updates = {}
    if (catchAll !== undefined) updates.catchAll = catchAll || null
    if (enabled !== undefined) updates.enabled = Boolean(enabled)
    const updated = updateEmailDomain(domain, updates)
    await regenerateMailConfigs()
    return res.json({ success: true, domain: updated })
  }

  // DELETE: Domain und alle Konten/Aliases entfernen
  if (req.method === 'DELETE') {
    // Alle Konten dieser Domain loeschen
    const accounts = getAccountsByDomain(domain)
    for (const a of accounts) deleteAccount(a.id)

    // Alle Aliases dieser Domain loeschen
    const aliases = getAliasesByDomain(domain)
    for (const a of aliases) deleteAlias(a.id)

    deleteEmailDomain(domain)
    await regenerateMailConfigs()
    return res.json({ success: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
