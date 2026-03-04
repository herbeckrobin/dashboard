// API: E-Mail-Konto fuer Domain anlegen

import { requireAuth } from '../../../../../lib/auth'
import { getEmailDomain } from '../../../../../lib/email/domains'
import { addAccount, getAccountsByDomain } from '../../../../../lib/email/accounts'
import { getEmailDomains } from '../../../../../lib/email/domains'
import { getGroup } from '../../../../../lib/db'
import { isUnlimited } from '../../../../../lib/packages'
import { regenerateMailConfigs } from '../../../../../lib/email/server'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return

  const { domain } = req.query
  const emailDomain = getEmailDomain(domain)
  if (!emailDomain) return res.status(404).json({ error: 'Domain nicht gefunden' })

  // POST: Neues Postfach anlegen
  if (req.method === 'POST') {
    const { local, password, quotaMb, displayName } = req.body

    // Validierung
    if (!local || !password) {
      return res.status(400).json({ error: 'Name und Passwort sind erforderlich' })
    }
    if (!/^[a-z0-9._-]+$/i.test(local)) {
      return res.status(400).json({ error: 'Ungueltiger Postfach-Name (nur a-z, 0-9, ., _, -)' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben' })
    }

    // Pruefen ob Postfach schon existiert
    const existing = getAccountsByDomain(domain)
    if (existing.find(a => a.local === local.toLowerCase())) {
      return res.status(409).json({ error: 'Postfach existiert bereits' })
    }

    // Gruppen-Limit pruefen
    if (emailDomain.groupId) {
      const group = getGroup(emailDomain.groupId)
      if (group && group.limits?.email && !isUnlimited(group.limits.email.count)) {
        // Alle Konten aller Domains dieser Gruppe zaehlen
        const groupDomains = getEmailDomains().filter(d => d.groupId === group.id)
        const totalAccounts = groupDomains.reduce(
          (sum, d) => sum + getAccountsByDomain(d.domain).length, 0
        )
        if (totalAccounts >= group.limits.email.count) {
          return res.status(403).json({
            error: `E-Mail-Limit erreicht (${totalAccounts}/${group.limits.email.count})`,
            limitReached: true,
          })
        }
      }
    }

    const email = `${local.toLowerCase()}@${domain}`
    const account = await addAccount({
      email,
      password,
      domain,
      quotaMb: quotaMb || 1024,
      displayName: displayName || '',
    })

    await regenerateMailConfigs()
    return res.json({ success: true, account: { ...account, passwordHash: undefined } })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
