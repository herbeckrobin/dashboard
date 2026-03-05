import fs from 'fs'
import path from 'path'

const HISTORY_FILE = path.join(process.cwd(), 'data', 'deploy-history.json')

export function getHistory(limit = 50, projectId = null) {
  try {
    const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'))
    let deploys = data.deploys || []
    if (projectId) deploys = deploys.filter(d => d.projectId === projectId)
    return deploys.slice(-limit).reverse()
  } catch {
    return []
  }
}

export function getStepEstimates(projectId) {
  const deploys = getHistory(50, projectId)
    .filter(d => d.success && d.stepDurations?.length > 0)
    .slice(0, 5)

  if (deploys.length === 0) return {}

  const totals = {}
  const counts = {}
  for (const deploy of deploys) {
    for (const step of deploy.stepDurations) {
      totals[step.name] = (totals[step.name] || 0) + step.durationMs
      counts[step.name] = (counts[step.name] || 0) + 1
    }
  }

  const estimates = {}
  for (const name of Object.keys(totals)) {
    estimates[name] = Math.round(totals[name] / counts[name])
  }
  return estimates
}

export function addToHistory(entry) {
  let data
  try {
    data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'))
    if (!data || !Array.isArray(data.deploys)) data = { deploys: [] }
  } catch {
    data = { deploys: [] }
  }
  data.deploys.push(entry)
  if (data.deploys.length > 200) {
    data.deploys = data.deploys.slice(-200)
  }
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2))
}
