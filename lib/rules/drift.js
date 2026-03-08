// Drift Detection — vergleicht letzte 2 Audits und findet Verschlechterungen

import { getAudits } from './storage.js'

export function detectDrift() {
  const audits = getAudits()
  if (audits.length < 2) return { drifted: [], newFailures: [], resolved: [] }

  const current = audits[0]
  const previous = audits[1]

  // Maps fuer schnellen Lookup: ruleId+projectId → passed
  const prevMap = new Map()
  for (const r of previous.results) {
    prevMap.set(`${r.ruleId}:${r.projectId || 'server'}`, r.passed)
  }

  const currMap = new Map()
  for (const r of current.results) {
    currMap.set(`${r.ruleId}:${r.projectId || 'server'}`, r)
  }

  const drifted = []      // passed → failed
  const newFailures = []   // neu und failed
  const resolved = []      // failed → passed

  for (const r of current.results) {
    const key = `${r.ruleId}:${r.projectId || 'server'}`
    const wasPassed = prevMap.get(key)

    if (wasPassed === true && !r.passed) {
      drifted.push(r)
    } else if (wasPassed === undefined && !r.passed) {
      newFailures.push(r)
    }
  }

  for (const r of previous.results) {
    const key = `${r.ruleId}:${r.projectId || 'server'}`
    const currentResult = currMap.get(key)
    if (!r.passed && currentResult?.passed) {
      resolved.push(currentResult)
    }
  }

  return { drifted, newFailures, resolved }
}
