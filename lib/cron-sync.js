// Crontab-Synchronisation fuer Projekt-Cronjobs
// Verwaltet deploy-User Crontab-Eintraege mit Marker-Kommentaren
import fs from 'fs'
import crypto from 'crypto'
import { runCommand } from './run-command.js'
import { getConfig, saveConfig } from './config.js'
import { getProject } from './db.js'

const LOCK_FILE = '/tmp/dashboard-cron-sync.lock'
const MARKER_PREFIX = '# dashboard-cron:'

// cronSecret aus config.json laden, bei Bedarf generieren
export function getCronSecret() {
  const config = getConfig()
  if (config.cronSecret) return config.cronSecret
  const secret = crypto.randomBytes(32).toString('hex')
  saveConfig({ cronSecret: secret })
  return secret
}

// File-Lock fuer Race-Condition-Schutz
async function withLock(fn) {
  // Warten falls Lock existiert (max 5s)
  const start = Date.now()
  while (fs.existsSync(LOCK_FILE) && Date.now() - start < 5000) {
    await new Promise(r => setTimeout(r, 100))
  }
  fs.writeFileSync(LOCK_FILE, `${process.pid}_${Date.now()}`)
  try {
    return await fn()
  } finally {
    try { fs.unlinkSync(LOCK_FILE) } catch {}
  }
}

// Deploy-User Crontab lesen
async function readDeployCrontab() {
  const result = await runCommand('sudo crontab -u deploy -l 2>/dev/null || true')
  const output = result.success ? result.output : ''
  return output.replace(/no crontab for.*/gi, '').trim()
}

// Deploy-User Crontab schreiben
async function writeDeployCrontab(content) {
  const tmpPath = '/tmp/dashboard-cron-update'
  fs.writeFileSync(tmpPath, content.trim() + '\n')
  await runCommand(`sudo crontab -u deploy ${tmpPath}`)
  fs.unlinkSync(tmpPath)
}

// Alle Crontab-Eintraege eines Projekts entfernen und neue setzen
export async function syncProjectCrons(projectId) {
  return withLock(async () => {
    const project = getProject(projectId)
    if (!project) return

    const config = getConfig()
    const adminDomain = config.adminDomain
    if (!adminDomain) return

    const secret = getCronSecret()
    const existing = await readDeployCrontab()
    const lines = existing.split('\n')

    // Bestehende Eintraege dieses Projekts entfernen
    // Format: Marker-Kommentar, dann curl-Befehl auf naechster Zeile
    const filtered = []
    let skipNext = false
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (skipNext) {
        skipNext = false
        continue
      }
      if (line.startsWith(`${MARKER_PREFIX}${projectId}:`)) {
        skipNext = true // Naechste Zeile (curl-Befehl) auch ueberspringen
        continue
      }
      filtered.push(line)
    }

    // Neue Eintraege fuer enabled Jobs hinzufuegen
    const cronJobs = project.cronJobs || []
    const newLines = []
    for (const job of cronJobs) {
      if (!job.enabled) continue
      newLines.push(`${MARKER_PREFIX}${projectId}:${job.id}`)
      const payload = JSON.stringify({ cronJobId: job.id, trigger: 'cron' })
      newLines.push(`${job.schedule} curl -sf -X POST -H 'Content-Type: application/json' -H 'X-Cron-Secret: ${secret}' https://${adminDomain}/api/projects/${projectId}/crons/run -d '${payload}' > /dev/null 2>&1`)
    }

    const result = [...filtered.filter(l => l.trim()), ...newLines].join('\n')
    if (result.trim()) {
      await writeDeployCrontab(result)
    } else {
      // Leere Crontab — entfernen
      await runCommand('sudo crontab -u deploy -r 2>/dev/null || true')
    }
  })
}

// Alle Cron-Eintraege eines Projekts entfernen (bei Projekt-Loeschung)
export async function removeProjectCrons(projectId) {
  return withLock(async () => {
    const existing = await readDeployCrontab()
    if (!existing) return

    const lines = existing.split('\n')
    const filtered = []
    let skipNext = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (skipNext) {
        skipNext = false
        continue
      }
      if (line.startsWith(`${MARKER_PREFIX}${projectId}:`)) {
        skipNext = true // Naechste Zeile (curl-Befehl) auch ueberspringen
        continue
      }
      filtered.push(line)
    }

    const result = filtered.filter(l => l.trim()).join('\n')
    if (result.trim()) {
      await writeDeployCrontab(result)
    } else {
      await runCommand('sudo crontab -u deploy -r 2>/dev/null || true')
    }
  })
}
