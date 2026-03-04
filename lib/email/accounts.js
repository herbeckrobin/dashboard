// E-Mail-Konto Verwaltung (CRUD, JSON-Datei)

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const ACCOUNTS_FILE = path.join(process.cwd(), 'data', 'email', 'accounts.json')

function ensureDir() {
  const dir = path.dirname(ACCOUNTS_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function getAccounts() {
  try {
    return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8')).accounts || []
  } catch {
    return []
  }
}

export function saveAccounts(accounts) {
  ensureDir()
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify({ accounts }, null, 2))
}

export function getAccount(id) {
  return getAccounts().find(a => a.id === id)
}

export function getAccountsByDomain(domain) {
  return getAccounts().filter(a => a.domain === domain)
}

export async function addAccount({ email, password, domain, quotaMb, displayName }) {
  const accounts = getAccounts()
  const [local] = email.split('@')
  const hash = await bcrypt.hash(password, 12)
  const account = {
    id: crypto.randomUUID(),
    email,
    local,
    domain,
    passwordHash: hash,
    quotaMb: quotaMb || 1024,
    displayName: displayName || '',
    enabled: true,
    autoReply: null,
    createdAt: new Date().toISOString(),
  }
  accounts.push(account)
  saveAccounts(accounts)
  return account
}

export async function updateAccount(id, updates) {
  const accounts = getAccounts()
  const idx = accounts.findIndex(a => a.id === id)
  if (idx === -1) return null
  if (updates.password) {
    updates.passwordHash = await bcrypt.hash(updates.password, 12)
    delete updates.password
  }
  accounts[idx] = { ...accounts[idx], ...updates }
  saveAccounts(accounts)
  return accounts[idx]
}

export function deleteAccount(id) {
  const accounts = getAccounts()
  const idx = accounts.findIndex(a => a.id === id)
  if (idx === -1) return null
  const deleted = accounts.splice(idx, 1)[0]
  saveAccounts(accounts)
  return deleted
}
