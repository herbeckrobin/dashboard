// API: Einzelnes E-Mail-Konto lesen, aendern, loeschen

// Body-Limit erhoehen fuer Signatur-Bilder (Base64)
export const config = { api: { bodyParser: { sizeLimit: '2mb' } } }

import { requireAuth } from '../../../../lib/auth'
import { getAccount, updateAccount, deleteAccount } from '../../../../lib/email/accounts'
import { regenerateMailConfigs, getMailboxSize } from '../../../../lib/email/server'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return

  const { id } = req.query
  const account = getAccount(id)
  if (!account) return res.status(404).json({ error: 'Konto nicht gefunden' })

  // GET: Konto-Details (mit Speicherverbrauch)
  if (req.method === 'GET') {
    const usedBytes = await getMailboxSize(account.domain, account.local)
    return res.json({
      account: { ...account, passwordHash: undefined },
      usedBytes,
    })
  }

  // PUT: Konto aktualisieren
  if (req.method === 'PUT') {
    const { password, quotaMb, displayName, enabled, autoReply } = req.body
    const updates = {}

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben' })
      }
      updates.password = password
    }
    if (quotaMb !== undefined) updates.quotaMb = parseInt(quotaMb) || 1024
    if (displayName !== undefined) updates.displayName = displayName
    if (enabled !== undefined) updates.enabled = Boolean(enabled)
    if (autoReply !== undefined) {
      if (autoReply && autoReply.enabled) {
        // Validierung
        if (!autoReply.subject || autoReply.subject.length > 200) {
          return res.status(400).json({ error: 'Betreff ist erforderlich (max 200 Zeichen)' })
        }
        if (!autoReply.body && !autoReply.htmlBody) {
          return res.status(400).json({ error: 'Nachricht ist erforderlich' })
        }
        if (autoReply.startDate && autoReply.endDate && autoReply.startDate > autoReply.endDate) {
          return res.status(400).json({ error: 'Startdatum muss vor dem Enddatum liegen' })
        }
        // Signatur-Bild: max 500KB Base64
        if (autoReply.signatureImage) {
          const sizeKb = Math.round(autoReply.signatureImage.length * 0.75 / 1024)
          if (sizeKb > 500) {
            return res.status(400).json({ error: `Signatur-Bild zu gross (${sizeKb}KB, max 500KB)` })
          }
          if (!/^data:image\/(png|jpe?g|gif|webp);base64,/.test(autoReply.signatureImage)) {
            return res.status(400).json({ error: 'Signatur muss ein Bild sein (PNG, JPG, GIF, WebP)' })
          }
        }
      }
      updates.autoReply = autoReply
    }

    const updated = await updateAccount(id, updates)
    await regenerateMailConfigs()
    return res.json({ success: true, account: { ...updated, passwordHash: undefined } })
  }

  // DELETE: Konto loeschen
  if (req.method === 'DELETE') {
    deleteAccount(id)
    await regenerateMailConfigs()
    return res.json({ success: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
