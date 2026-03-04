// DKIM-Schluessel generieren und DNS-Records zusammenstellen

import { runCommand } from '../run-command.js'
import { getEmailDomain, updateEmailDomain } from './domains.js'

// DKIM-Key fuer eine Domain generieren
export async function generateDkim(domain) {
  const selector = 'mail'
  const keyPath = `/var/lib/rspamd/dkim/${domain}.key`

  // RSA-2048-Key generieren
  const r1 = await runCommand(
    `sudo openssl genrsa -out ${keyPath} 2048 2>/dev/null && sudo chown _rspamd:_rspamd ${keyPath} && sudo chmod 640 ${keyPath}`
  )
  if (!r1.success) return { success: false, error: r1.error }

  // Public Key extrahieren (fuer DNS TXT Record)
  const r2 = await runCommand(
    `sudo openssl rsa -in ${keyPath} -pubout -outform PEM 2>/dev/null | grep -v "^-" | tr -d '\\n'`
  )
  if (!r2.success) return { success: false, error: r2.error }

  // Domain aktualisieren
  updateEmailDomain(domain, {
    dkimGenerated: true,
    dkimPublicKey: r2.output,
    dkimSelector: selector,
  })

  // rspamd neu laden damit neuer Key verwendet wird
  await runCommand('sudo systemctl reload rspamd')

  return { success: true, publicKey: r2.output, selector }
}

// Alle benoetigten DNS-Records fuer eine Domain
export function getDnsRecords(domain) {
  const emailDomain = getEmailDomain(domain)
  const records = []

  // MX
  records.push({
    type: 'MX',
    host: domain,
    value: 'mail.rhdemo.de',
    priority: 10,
    description: 'Mail-Empfang ueber diesen Server',
  })

  // SPF
  records.push({
    type: 'TXT',
    host: domain,
    value: 'v=spf1 mx a:mail.rhdemo.de ~all',
    description: 'SPF — Erlaubt nur diesem Server E-Mails zu senden',
  })

  // DKIM (wenn generiert)
  if (emailDomain?.dkimGenerated && emailDomain.dkimPublicKey) {
    records.push({
      type: 'TXT',
      host: `${emailDomain.dkimSelector}._domainkey.${domain}`,
      value: `v=DKIM1; k=rsa; p=${emailDomain.dkimPublicKey}`,
      description: 'DKIM — Signatur fuer ausgehende E-Mails',
    })
  }

  // DMARC
  records.push({
    type: 'TXT',
    host: `_dmarc.${domain}`,
    value: 'v=DMARC1; p=quarantine; rua=mailto:postmaster@rhdemo.de; pct=100',
    description: 'DMARC — Policy fuer fehlgeschlagene SPF/DKIM-Pruefungen',
  })

  return records
}
