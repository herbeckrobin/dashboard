import fs from 'fs'
import path from 'path'
import { addToHistory } from './deploy-history'

const LOG_DIR = path.join(process.cwd(), 'data', 'deploy-logs')

// Sicherstellen dass das Verzeichnis existiert
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

function logPath(projectId) {
  return path.join(LOG_DIR, `${projectId}.json`)
}

export function initLog(projectId, steps, trigger = 'manual', triggerInfo = null) {
  const log = {
    projectId,
    trigger,
    triggerInfo,
    startedAt: new Date().toISOString(),
    steps: steps.map(s => ({ name: s, status: 'pending', output: '' })),
    fileChanges: [],
    done: false,
    success: null,
  }
  fs.writeFileSync(logPath(projectId), JSON.stringify(log, null, 2))
  return log
}

export function updateStep(projectId, stepIndex, update) {
  const log = getLog(projectId)
  if (!log || !log.steps[stepIndex]) return
  log.steps[stepIndex] = { ...log.steps[stepIndex], ...update }
  fs.writeFileSync(logPath(projectId), JSON.stringify(log, null, 2))
}

export function finishLog(projectId, success, projectName = null) {
  const log = getLog(projectId)
  if (!log) return
  log.done = true
  log.success = success
  log.finishedAt = new Date().toISOString()
  fs.writeFileSync(logPath(projectId), JSON.stringify(log, null, 2))

  // AI-Kosten aus Steps summieren
  const aiCostUsd = log.steps.reduce((sum, s) => sum + (s.costUsd || 0), 0)

  addToHistory({
    id: `deploy_${Date.now()}`,
    projectId,
    projectName: projectName || projectId,
    trigger: log.trigger || 'manual',
    triggerInfo: log.triggerInfo || null,
    success,
    startedAt: log.startedAt,
    finishedAt: log.finishedAt,
    durationMs: new Date(log.finishedAt) - new Date(log.startedAt),
    stepCount: log.steps.length,
    failedStep: success ? null : (log.steps.find(s => s.status === 'error')?.name || null),
    stepDurations: log.steps
      .filter(s => s.startedAt && s.finishedAt)
      .map(s => ({ name: s.name, durationMs: new Date(s.finishedAt) - new Date(s.startedAt) })),
    ...(aiCostUsd > 0 ? { aiCostUsd: Math.round(aiCostUsd * 10000) / 10000 } : {}),
  })
}

export function trackFile(projectId, filePath, basePath, content) {
  const log = getLog(projectId)
  if (!log) return
  const relativePath = filePath.replace(basePath + '/', '')
  const preview = typeof content === 'string' ? content.split('\n').slice(0, 5).join('\n') : ''
  if (!log.fileChanges) log.fileChanges = []
  log.fileChanges.push({ path: relativePath, preview, timestamp: Date.now() })
  fs.writeFileSync(logPath(projectId), JSON.stringify(log, null, 2))
}

export function getLog(projectId) {
  try {
    const data = fs.readFileSync(logPath(projectId), 'utf8')
    return JSON.parse(data)
  } catch (e) {
    return null
  }
}

// Verzeichnisse die beim Scan ignoriert werden
const SCAN_IGNORE = new Set([
  'node_modules', '.git', 'vendor', 'build', 'cache',
  '.next', '.nuxt', 'dist', '.cache', '__pycache__',
])

// Rekursiver Verzeichnis-Scan — gibt Map<relativePath, mtimeMs> zurueck
export function scanDirectory(basePath) {
  const files = new Map()
  if (!fs.existsSync(basePath)) return files

  function walk(dir, prefix) {
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      if (entry.name.startsWith('.') && SCAN_IGNORE.has(entry.name)) continue
      if (SCAN_IGNORE.has(entry.name)) continue
      const fullPath = path.join(dir, entry.name)
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        walk(fullPath, relPath)
      } else if (entry.isFile()) {
        try {
          const stat = fs.statSync(fullPath)
          files.set(relPath, stat.mtimeMs)
        } catch {}
      }
    }
  }

  walk(basePath, '')
  return files
}

// Diff zwischen zwei Snapshots berechnen und neue Dateien tracken (Batch-Write)
export function trackFilesFromDiff(projectId, basePath, before, after) {
  const log = getLog(projectId)
  if (!log) return 0
  if (!log.fileChanges) log.fileChanges = []

  const now = Date.now()
  let count = 0

  for (const [relPath] of after) {
    if (!before.has(relPath)) {
      log.fileChanges.push({ path: relPath, preview: '', timestamp: now })
      count++
    }
  }

  if (count > 0) {
    fs.writeFileSync(logPath(projectId), JSON.stringify(log, null, 2))
  }
  return count
}
