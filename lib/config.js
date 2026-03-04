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
