import fs from 'fs'
import path from 'path'

const CONFIG_FILE = path.join(process.cwd(), 'data', 'config.json')

export function getConfig() {
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8')
    return JSON.parse(data)
  } catch (e) {
    return { giteaToken: '' }
  }
}

export function saveConfig(updates) {
  const config = { ...getConfig(), ...updates }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
  return config
}

// Domain-Konfiguration aus config.json (von install.sh gesetzt)
export function getAdminEmail() {
  return getConfig().adminEmail || 'info@robinherbeck.com'
}

export function getDomainConfig() {
  const config = getConfig()
  return {
    serverDomain: config.serverDomain || '',
    gitDomain: config.gitDomain || '',
    mailDomain: config.mailDomain || '',
    adminDomain: config.adminDomain || '',
    webmailUrl: config.webmailUrl || '',
  }
}
