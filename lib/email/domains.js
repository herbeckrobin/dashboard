// E-Mail Domain-Verwaltung (welche Domains haben E-Mail aktiviert)

import fs from 'fs'
import path from 'path'

const DOMAINS_FILE = path.join(process.cwd(), 'data', 'email', 'domains.json')

function ensureDir() {
  const dir = path.dirname(DOMAINS_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function getEmailDomains() {
  try {
    return JSON.parse(fs.readFileSync(DOMAINS_FILE, 'utf8')).domains || []
  } catch {
    return []
  }
}

export function saveEmailDomains(domains) {
  ensureDir()
  fs.writeFileSync(DOMAINS_FILE, JSON.stringify({ domains }, null, 2))
}

export function getEmailDomain(domain) {
  return getEmailDomains().find(d => d.domain === domain)
}

export function addEmailDomain({ domain, groupId }) {
  const domains = getEmailDomains()
  if (domains.find(d => d.domain === domain)) return null
  const entry = {
    domain,
    groupId: groupId || null,
    enabled: true,
    catchAll: null,
    dkimSelector: 'mail',
    dkimGenerated: false,
    dkimPublicKey: null,
    createdAt: new Date().toISOString(),
  }
  domains.push(entry)
  saveEmailDomains(domains)
  return entry
}

export function updateEmailDomain(domain, updates) {
  const domains = getEmailDomains()
  const idx = domains.findIndex(d => d.domain === domain)
  if (idx === -1) return null
  domains[idx] = { ...domains[idx], ...updates }
  saveEmailDomains(domains)
  return domains[idx]
}

export function deleteEmailDomain(domain) {
  const domains = getEmailDomains()
  const idx = domains.findIndex(d => d.domain === domain)
  if (idx === -1) return null
  const deleted = domains.splice(idx, 1)[0]
  saveEmailDomains(domains)
  return deleted
}
