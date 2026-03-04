// API: Alias erstellen

import { requireAuth } from '../../../../lib/auth'
import { addAlias } from '../../../../lib/email/aliases'
import { getEmailDomain } from '../../../../lib/email/domains'
import { getAccountsByDomain } from '../../../../lib/email/accounts'
import { regenerateMailConfigs } from '../../../../lib/email/server'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return

  if (req.method === 'POST') {
    const { source, destination, domain } = req.body

    if (!source || !destination || !domain) {
      return res.status(400).json({ error: 'Quelle, Ziel und Domain sind erforderlich' })
    }

    // Domain muss aktiviert sein
    const emailDomain = getEmailDomain(domain)
    if (!emailDomain) {
      return res.status(404).json({ error: 'Domain nicht fuer E-Mail aktiviert' })
    }

    // Pruefen ob source ein existierendes Postfach ist
    const accounts = getAccountsByDomain(domain)
    if (accounts.find(a => a.email === source)) {
      return res.status(409).json({ error: 'Ein Postfach mit dieser Adresse existiert bereits' })
    }

    const alias = addAlias({ source, destination, domain })
    if (!alias) return res.status(409).json({ error: 'Alias existiert bereits' })

    await regenerateMailConfigs()
    return res.json({ success: true, alias })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
