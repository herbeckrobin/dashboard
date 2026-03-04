// E-Mail Alias-Verwaltung (Weiterleitungen)

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const ALIASES_FILE = path.join(process.cwd(), 'data', 'email', 'aliases.json')

function ensureDir() {
  const dir = path.dirname(ALIASES_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function getAliases() {
  try {
    return JSON.parse(fs.readFileSync(ALIASES_FILE, 'utf8')).aliases || []
  } catch {
    return []
  }
}

export function saveAliases(aliases) {
  ensureDir()
  fs.writeFileSync(ALIASES_FILE, JSON.stringify({ aliases }, null, 2))
}

export function getAliasesByDomain(domain) {
  return getAliases().filter(a => a.domain === domain)
}

export function addAlias({ source, destination, domain }) {
  const aliases = getAliases()
  if (aliases.find(a => a.source === source)) return null
  const alias = {
    id: crypto.randomUUID(),
    source,
    destination,
    domain,
    enabled: true,
    createdAt: new Date().toISOString(),
  }
  aliases.push(alias)
  saveAliases(aliases)
  return alias
}

export function updateAlias(id, updates) {
  const aliases = getAliases()
  const idx = aliases.findIndex(a => a.id === id)
  if (idx === -1) return null
  aliases[idx] = { ...aliases[idx], ...updates }
  saveAliases(aliases)
  return aliases[idx]
}

export function deleteAlias(id) {
  const aliases = getAliases()
  const idx = aliases.findIndex(a => a.id === id)
  if (idx === -1) return null
  const deleted = aliases.splice(idx, 1)[0]
  saveAliases(aliases)
  return deleted
}
