// DNS-Abfrage fuer Projekt-Domains
// Nutzt dig fuer zuverlaessige DNS-Abfragen auf dem Server

import { runCommand } from './run-command.js'
import { escapeShellArg } from './validate.js'

// Cache: domain → { result, timestamp }
const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 Minuten

// Server-IP Cache
let serverIpCache = { ip: null, timestamp: 0 }
const IP_CACHE_TTL = 30 * 60 * 1000 // 30 Minuten

export async function getServerIp() {
  if (serverIpCache.ip && Date.now() - serverIpCache.timestamp < IP_CACHE_TTL) {
    return serverIpCache.ip
  }
  const result = await runCommand("ip -4 addr show | grep 'inet ' | grep -v '127.0.0' | grep -v '172.' | awk '{print $2}' | cut -d/ -f1 | head -1")
  const ip = result.output?.trim() || null
  serverIpCache = { ip, timestamp: Date.now() }
  return ip
}

// DNS-Records per dig abfragen (ein Aufruf fuer alle Typen)
async function lookupAllRecords(domain) {
  const safe = escapeShellArg(domain)
  const records = { a: [], aaaa: [], cname: [], mx: [], txt: [], ns: [] }

  // dig ANY ist unzuverlaessig, daher einzelne Typen abfragen
  // Aber in einem einzigen dig-Aufruf mit mehreren Queries
  const result = await runCommand(
    `dig @8.8.8.8 +noall +answer ${safe} A ${safe} AAAA ${safe} CNAME ${safe} MX ${safe} TXT ${safe} NS 2>/dev/null`,
    10000
  )

  if (!result.success || !result.output) return records

  for (const line of result.output.split('\n')) {
    const parts = line.trim().split(/\s+/)
    if (parts.length < 5) continue

    const type = parts[3]
    const value = parts.slice(4).join(' ')

    switch (type) {
      case 'A':
        records.a.push(value)
        break
      case 'AAAA':
        records.aaaa.push(value)
        break
      case 'CNAME':
        records.cname.push(value.replace(/\.$/, ''))
        break
      case 'MX': {
        const priority = parseInt(parts[4], 10)
        const exchange = parts[5]?.replace(/\.$/, '') || ''
        if (exchange) records.mx.push({ priority, exchange })
        break
      }
      case 'TXT':
        records.txt.push(value.replace(/^"|"$/g, '').replace(/"\s*"/g, ''))
        break
      case 'NS':
        records.ns.push(value.replace(/\.$/, ''))
        break
    }
  }

  records.mx.sort((a, b) => a.priority - b.priority)
  return records
}

// DNS-Check fuer eine Projekt-Domain
export async function checkDomainDns(domain, { serverIp, wwwAlias, fresh } = {}) {
  // Cache pruefen
  const cacheKey = `${domain}:${wwwAlias}`
  if (!fresh) {
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.result
    }
  }

  const records = await lookupAllRecords(domain)

  const checks = {
    pointsToServer: serverIp ? records.a.includes(serverIp) : null,
  }

  let www = null
  if (wwwAlias) {
    www = await lookupAllRecords(`www.${domain}`)
    checks.wwwExists = www.a.length > 0 || www.cname.length > 0
    checks.wwwPointsToServer = serverIp ? www.a.includes(serverIp) : null
    // CNAME auf Hauptdomain zaehlt auch
    if (!checks.wwwPointsToServer && www.cname.includes(domain)) {
      checks.wwwPointsToServer = checks.pointsToServer
    }
  }

  const result = { records, www, checks, serverIp }

  cache.set(cacheKey, { result, timestamp: Date.now() })
  return result
}
