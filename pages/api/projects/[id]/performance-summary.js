import { requireAuth } from '../../../../lib/auth'
import { getProject } from '../../../../lib/db'
import { getPerformanceData, getLatestScore } from '../../../../lib/performance'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query
  const project = getProject(id)
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' })

  const data = getPerformanceData(id)
  const latest = getLatestScore(id)

  // Trend aus den letzten 5 Checks berechnen
  const recent = data.checks.slice(-5)
  const scores = recent
    .map(c => c.pagespeed?.performance ?? c.lighthouse?.performance ?? null)
    .filter(v => v !== null)
  let trend = 'unknown'
  if (scores.length >= 2) {
    const diff = scores[scores.length - 1] - scores[0]
    trend = diff > 5 ? 'improving' : diff < -5 ? 'declining' : 'stable'
  }

  res.json({
    ...project,
    latest,
    trend,
    checksCount: data.checks.length,
    history: data.checks
  })
}
