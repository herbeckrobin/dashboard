// DNS-Pruefung fuer E-Mail-Domains
// Nutzt mehrere DNS-Resolver fuer konsistente Ergebnisse + Cache

import dns from 'dns'

// Verschiedene DNS-Resolver fuer unabhaengige Abfragen
const RESOLVERS = ['8.8.8.8', '1.1.1.1', '9.9.9.9']

// Cache: Domain → { checks, timestamp }
const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 Minuten

// DNS-Check mit einem bestimmten Resolver
async function checkWithResolver(domain, server) {
  const resolver = new dns.promises.Resolver()
  resolver.setServers([server])
  const checks = { mx: false, spf: false, dkim: false, dmarc: false }

  try {
    const mx = await resolver.resolveMx(domain)
    checks.mx = mx.some(r => r.exchange.includes('mail.rhdemo.de'))
  } catch {}

  try {
    const txt = await resolver.resolveTxt(domain)
    const flat = txt.map(r => r.join(''))
    checks.spf = flat.some(r => r.includes('v=spf1') && r.includes('mail.rhdemo.de'))
  } catch {}

  try {
    const dkimTxt = await resolver.resolveTxt(`mail._domainkey.${domain}`)
    const flat = dkimTxt.map(r => r.join(''))
    checks.dkim = flat.some(r => r.includes('v=DKIM1'))
  } catch {}

  try {
    const dmarcTxt = await resolver.resolveTxt(`_dmarc.${domain}`)
    const flat = dmarcTxt.map(r => r.join(''))
    checks.dmarc = flat.some(r => r.includes('v=DMARC1'))
  } catch {}

  return checks
}

// Alle relevanten DNS-Records pruefen (3 Resolver, Mehrheit entscheidet)
export async function checkEmailDns(domain) {
  // Cache pruefen
  const cached = cache.get(domain)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.checks
  }

  // Parallele Abfragen an verschiedene DNS-Resolver
  const results = await Promise.all(
    RESOLVERS.map(server => checkWithResolver(domain, server).catch(() => (
      { mx: false, spf: false, dkim: false, dmarc: false }
    )))
  )

  // Mehrheit entscheidet (2 von 3)
  const checks = {
    mx: results.filter(r => r.mx).length >= 2,
    spf: results.filter(r => r.spf).length >= 2,
    dkim: results.filter(r => r.dkim).length >= 2,
    dmarc: results.filter(r => r.dmarc).length >= 2,
  }

  // Ergebnis cachen
  cache.set(domain, { checks, timestamp: Date.now() })

  return checks
}
