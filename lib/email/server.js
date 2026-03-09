// E-Mail Server-Konfiguration generieren und Services neu laden
// Pattern: JSON-Daten lesen → Config-Dateien generieren → temp file → sudo mv → reload

import fs from 'fs'
import { runCommand, runQuick } from '../run-command.js'
import { getAccounts } from './accounts.js'
import { getEmailDomains } from './domains.js'
import { getAliases } from './aliases.js'

// Postfix: virtual_mailbox_domains
function generateDomainsMap() {
  const domains = getEmailDomains().filter(d => d.enabled)
  return domains.map(d => `${d.domain} OK`).join('\n') + '\n'
}

// Postfix: virtual_mailbox_maps
function generateMailboxesMap() {
  const accounts = getAccounts().filter(a => a.enabled)
  return accounts.map(a => `${a.email} ${a.domain}/${a.local}/Maildir/`).join('\n') + '\n'
}

// Postfix: virtual_alias_maps (Aliases + Catch-All)
function generateAliasesMap() {
  const lines = []

  // Aliases
  const aliases = getAliases().filter(a => a.enabled)
  for (const a of aliases) {
    lines.push(`${a.source} ${a.destination}`)
  }

  // Catch-All
  const domains = getEmailDomains().filter(d => d.enabled && d.catchAll)
  for (const d of domains) {
    lines.push(`@${d.domain} ${d.catchAll}`)
  }

  return lines.join('\n') + '\n'
}

// Dovecot: passwd-file
function generatePasswdFile() {
  const accounts = getAccounts().filter(a => a.enabled)
  return accounts.map(a => {
    const quotaRule = a.quotaMb > 0 ? `userdb_quota_rule=*:storage=${a.quotaMb}M` : ''
    return `${a.email}:${a.passwordHash}:5000:5000::/var/vmail/${a.domain}/${a.local}::${quotaRule}`
  }).join('\n') + '\n'
}

// Sieve Auto-Reply Script generieren (HTML + Signatur-Bild)
export function generateSieveScript(account) {
  if (!account.autoReply || !account.autoReply.enabled) return null

  const { subject, body, htmlBody, signatureImage, startDate, endDate } = account.autoReply
  const escSubject = (subject || 'Automatische Antwort').replace(/"/g, '\\"')
  const handle = `vacation-${account.local}-${account.domain}`
  const hasHtml = htmlBody || signatureImage

  // MIME-Body bauen wenn HTML oder Signatur vorhanden
  let mimeBody = null
  if (hasHtml) {
    mimeBody = buildMimeBody(account)
  }

  const requires = ['vacation', 'date', 'relational']
  if (mimeBody) requires.push('mime')
  const lines = [`require [${requires.map(r => `"${r}"`).join(', ')}];`, '']

  const conditions = []
  if (startDate) conditions.push(`currentdate :value "ge" "date" "${startDate}"`)
  if (endDate) conditions.push(`currentdate :value "le" "date" "${endDate}"`)

  // Vacation-Befehl mit :handle fuer Deduplizierung (einmal pro Absender)
  const vacParts = [':days 1', `:handle "${handle}"`, `:subject "${escSubject}"`]
  if (mimeBody) vacParts.push(':mime')
  const vacLine = `vacation ${vacParts.join(' ')}`

  const bodyText = mimeBody
    ? mimeBody.replace(/"/g, '\\"')
    : (body || '').replace(/"/g, '\\"')

  if (conditions.length > 0) {
    lines.push(`if allof(${conditions.join(', ')}) {`)
    lines.push(`  ${vacLine}`)
    lines.push(`    "${bodyText}";`)
    lines.push('}')
  } else {
    lines.push(vacLine)
    lines.push(`  "${bodyText}";`)
  }

  return lines.join('\n')
}

// MIME Multipart Body fuer HTML-Vacation mit optionalem Signatur-Bild
function buildMimeBody(account) {
  const { body, htmlBody, signatureImage, displayName } = account.autoReply
  const plainText = body || ''
  const boundary = '----=_VacationBoundary'
  const senderName = account.displayName || displayName || ''

  // HTML aufbauen
  let html = htmlBody || plainText.replace(/\n/g, '<br>')

  // Signatur-Bild einbetten wenn vorhanden
  if (signatureImage) {
    html += `\\r\\n<br><br><img src=\\"cid:signature-image\\" alt=\\"${senderName}\\" style=\\"max-width:600px;height:auto;\\" />`
  }

  const htmlWrapped = `<!DOCTYPE html><html><head><meta charset=\\"utf-8\\"></head><body style=\\"font-family:sans-serif;font-size:14px;color:#333;\\">${html}</body></html>`

  const parts = []
  parts.push(`Content-Type: multipart/alternative; boundary=\\"${boundary}\\"`)
  parts.push(`MIME-Version: 1.0`)
  parts.push('')

  // Plain Text Teil
  parts.push(`--${boundary}`)
  parts.push('Content-Type: text/plain; charset=utf-8')
  parts.push('Content-Transfer-Encoding: quoted-printable')
  parts.push('')
  parts.push(plainText)
  parts.push('')

  if (signatureImage) {
    // Wechsel zu multipart/related fuer embedded image
    const relBoundary = '----=_RelatedBoundary'
    parts[0] = `Content-Type: multipart/mixed; boundary=\\"${boundary}\\"` // outer
    // Rewrite: related wrapper um HTML + Bild
    parts.push(`--${boundary}`)
    parts.push(`Content-Type: multipart/related; boundary=\\"${relBoundary}\\"`)
    parts.push('')
    parts.push(`--${relBoundary}`)
    parts.push('Content-Type: text/html; charset=utf-8')
    parts.push('Content-Transfer-Encoding: quoted-printable')
    parts.push('')
    parts.push(htmlWrapped)
    parts.push('')
    parts.push(`--${relBoundary}`)

    // Bild-Typ aus Base64-Header ermitteln
    const mimeMatch = signatureImage.match(/^data:(image\/[a-z+]+);base64,/)
    const imgMime = mimeMatch ? mimeMatch[1] : 'image/png'
    const imgData = signatureImage.replace(/^data:image\/[a-z+]+;base64,/, '')

    parts.push(`Content-Type: ${imgMime}`)
    parts.push('Content-Transfer-Encoding: base64')
    parts.push('Content-ID: <signature-image>')
    parts.push('Content-Disposition: inline; filename=\\"signature.png\\"')
    parts.push('')
    parts.push(imgData)
    parts.push('')
    parts.push(`--${relBoundary}--`)
  } else {
    // Nur HTML ohne Bild
    parts.push(`--${boundary}`)
    parts.push('Content-Type: text/html; charset=utf-8')
    parts.push('Content-Transfer-Encoding: quoted-printable')
    parts.push('')
    parts.push(htmlWrapped)
    parts.push('')
  }

  parts.push(`--${boundary}--`)
  return parts.join('\\r\\n')
}

// Sieve-Script fuer ein Konto schreiben
async function writeSieveScript(account) {
  const script = generateSieveScript(account)
  const sieveDir = `/var/vmail/${account.domain}/${account.local}/sieve`
  const sievePath = `${sieveDir}/vacation.sieve`
  const activeLink = `/var/vmail/${account.domain}/${account.local}/.dovecot.sieve`

  if (!script) {
    // Auto-Reply deaktiviert — Sieve-Script und Symlink entfernen
    await runCommand(`sudo rm -f ${sievePath} ${sievePath}c ${activeLink}`)
    return
  }

  fs.writeFileSync('/tmp/sieve-vacation.sieve', script)
  await runCommand(`sudo mkdir -p ${sieveDir} && sudo mv /tmp/sieve-vacation.sieve ${sievePath}`)
  await runCommand(`sudo chown -R vmail:vmail ${sieveDir}`)
  await runCommand(`sudo -u vmail sievec ${sievePath} 2>/dev/null`)
  await runCommand(`sudo ln -sf ${sievePath} ${activeLink}`)
}

// Alle Config-Dateien neu schreiben und Services neu laden
export async function regenerateMailConfigs() {
  const errors = []

  // 1. Postfix virtual domains (chown root noetig, sonst verweigert postmap die .db-Erstellung)
  fs.writeFileSync('/tmp/postfix-virtual-domains', generateDomainsMap())
  const r1 = await runCommand('sudo mv /tmp/postfix-virtual-domains /etc/postfix/virtual/domains && sudo chown root:root /etc/postfix/virtual/domains && sudo postmap /etc/postfix/virtual/domains')
  if (!r1.success) errors.push('domains: ' + r1.error)

  // 2. Postfix virtual mailboxes
  fs.writeFileSync('/tmp/postfix-virtual-mailboxes', generateMailboxesMap())
  const r2 = await runCommand('sudo mv /tmp/postfix-virtual-mailboxes /etc/postfix/virtual/mailboxes && sudo chown root:root /etc/postfix/virtual/mailboxes && sudo postmap /etc/postfix/virtual/mailboxes')
  if (!r2.success) errors.push('mailboxes: ' + r2.error)

  // 3. Postfix virtual aliases
  fs.writeFileSync('/tmp/postfix-virtual-aliases', generateAliasesMap())
  const r3 = await runCommand('sudo mv /tmp/postfix-virtual-aliases /etc/postfix/virtual/aliases && sudo chown root:root /etc/postfix/virtual/aliases && sudo postmap /etc/postfix/virtual/aliases')
  if (!r3.success) errors.push('aliases: ' + r3.error)

  // 4. Dovecot passwd file
  fs.writeFileSync('/tmp/dovecot-passwd', generatePasswdFile())
  const r4 = await runCommand('sudo mv /tmp/dovecot-passwd /etc/dovecot/users/passwd && sudo chmod 640 /etc/dovecot/users/passwd && sudo chown root:dovecot /etc/dovecot/users/passwd')
  if (!r4.success) errors.push('passwd: ' + r4.error)

  // 5. Sieve-Scripts fuer Konten mit Auto-Reply
  const accounts = getAccounts()
  for (const account of accounts) {
    if (account.autoReply) {
      await writeSieveScript(account)
    }
  }

  // 6. Services neu laden
  const r5 = await runCommand('sudo systemctl reload postfix')
  if (!r5.success) errors.push('postfix reload: ' + r5.error)
  const r6 = await runCommand('sudo doveadm reload 2>/dev/null || sudo systemctl reload dovecot')
  if (!r6.success) errors.push('dovecot reload: ' + r6.error)

  return { success: errors.length === 0, errors }
}

// Mail-Queue abfragen
export async function getMailQueue() {
  const result = await runCommand('sudo postqueue -j 2>/dev/null')
  if (!result.success || !result.output) return []
  try {
    return result.output.split('\n').filter(l => l.trim()).map(l => JSON.parse(l))
  } catch {
    return []
  }
}

// Mail-Queue flushen
export async function flushMailQueue() {
  return runCommand('sudo postqueue -f')
}

// Einzelne Mail aus Queue loeschen
export async function deleteFromQueue(queueId) {
  // Queue-ID validieren (nur alphanumerisch + *)
  if (!/^[A-Za-z0-9*]+$/.test(queueId)) {
    return { success: false, error: 'Ungueltige Queue-ID' }
  }
  return runCommand(`sudo postsuper -d ${queueId}`)
}

// Postfach-Groesse ermitteln
const sizeCache = new Map()
const SIZE_CACHE_TTL = 5 * 60 * 1000

export async function getMailboxSize(domain, local) {
  const key = `${domain}/${local}`
  const cached = sizeCache.get(key)
  if (cached && Date.now() - cached.at < SIZE_CACHE_TTL) return cached.bytes

  const output = await runQuick(`sudo du -sb /var/vmail/${domain}/${local}/ 2>/dev/null | cut -f1`)
  const bytes = parseInt(output) || 0
  sizeCache.set(key, { bytes, at: Date.now() })
  return bytes
}
