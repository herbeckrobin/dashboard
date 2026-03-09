// DNS-Abfrage fuer Projekt-Domains
// Zeigt alle aktiven DNS-Eintraege + prueft ob Domain auf Server zeigt

import dns from 'dns'
import { runCommand } from './run-command.js'

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

// Alle DNS-Records einer Domain abfragen
async function lookupAllRecords(domain) {
  const resolver = new dns.promises.Resolver()
  resolver.setServers(['8.8.8.8'])

  const records = { a: [], aaaa: [], cname: [], mx: [], txt: [], ns: [] }

  const queries = [
    resolver.resolve4(domain).then(r => { records.a = r }).catch(() => {}),
    resolver.resolve6(domain).then(r => { records.aaaa = r }).catch(() => {}),
    resolver.resolveCname(domain).then(r => { records.cname = r }).catch(() => {}),
    resolver.resolveMx(domain).then(r => { records.mx = r.sort((a, b) => a.priority - b.priority) }).catch(() => {}),
    resolver.resolveTxt(domain).then(r => { records.txt = r.map(parts => parts.join('')) }).catch(() => {}),
    resolver.resolveNs(domain).then(r => { records.ns = r }).catch(() => {}),
  ]

  await Promise.all(queries)
  return records
}

// DNS-Check fuer eine Projekt-Domain
export async function checkDomainDns(domain, { serverIp, wwwAlias } = {}) {
  // Cache pruefen
  const cacheKey = `${domain}:${wwwAlias}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result
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
