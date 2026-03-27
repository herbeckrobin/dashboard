// Cron-Job Ausfuehrungslogs — separate Dateien pro Projekt
import fs from 'fs'
import path from 'path'

const LOG_DIR = path.join(process.cwd(), 'data', 'cron-logs')
const MAX_RUNS = 100
const MAX_OUTPUT_BYTES = 10 * 1024 // 10KB

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

function logPath(projectId) {
  return path.join(LOG_DIR, `${projectId}.json`)
}

function readLog(projectId) {
  try {
    const data = fs.readFileSync(logPath(projectId), 'utf8')
    return JSON.parse(data)
  } catch {
    return { runs: [] }
  }
}

function writeLog(projectId, log) {
  fs.writeFileSync(logPath(projectId), JSON.stringify(log, null, 2))
}

export function addCronRun(projectId, entry) {
  const log = readLog(projectId)
  // Output kuerzen
  if (entry.output && entry.output.length > MAX_OUTPUT_BYTES) {
    entry.output = entry.output.slice(0, MAX_OUTPUT_BYTES) + '\n... (gekuerzt)'
  }
  log.runs.unshift(entry)
  // Rotation: aelteste Eintraege entfernen
  if (log.runs.length > MAX_RUNS) {
    log.runs = log.runs.slice(0, MAX_RUNS)
  }
  writeLog(projectId, log)
}

export function getCronRuns(projectId, cronJobId = null, limit = 50) {
  const log = readLog(projectId)
  let runs = log.runs
  if (cronJobId) {
    runs = runs.filter(r => r.cronJobId === cronJobId)
  }
  return runs.slice(0, limit)
}

export function deleteCronLogs(projectId) {
  const filePath = logPath(projectId)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}
