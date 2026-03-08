// Audit-Ergebnisse persistent speichern und laden

import fs from 'fs'
import path from 'path'

const AUDITS_FILE = path.join(process.cwd(), 'data', 'rules', 'audits.json')
const MAX_AUDITS = 50

// Severity-Gewichtung fuer Score-Berechnung
const SEVERITY_WEIGHTS = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

function ensureDir() {
  const dir = path.dirname(AUDITS_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export function getAudits() {
  try {
    const data = fs.readFileSync(AUDITS_FILE, 'utf8')
    return JSON.parse(data).audits || []
  } catch {
    return []
  }
}

export function getLastAudit() {
  const audits = getAudits()
  return audits.length > 0 ? audits[0] : null
}

export function saveAudit(audit) {
  ensureDir()
  const audits = getAudits()
  audits.unshift(audit) // Neuester zuerst
  if (audits.length > MAX_AUDITS) audits.length = MAX_AUDITS
  fs.writeFileSync(AUDITS_FILE, JSON.stringify({ audits }, null, 2))
}

// Score berechnen (gewichtet nach Severity)
// Score = gewichtete passed / gewichtete total * 100
export function calculateScore(results) {
  if (results.length === 0) return 100

  let totalWeight = 0
  let passedWeight = 0

  for (const result of results) {
    const weight = SEVERITY_WEIGHTS[result.severity] || 1
    totalWeight += weight
    if (result.passed) passedWeight += weight
  }

  return totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 100
}
