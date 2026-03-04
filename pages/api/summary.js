import { requireAuth } from '../../lib/auth'
import { getProjects, getGroups, getGroupProjects } from '../../lib/db'
import { getLatestScore } from '../../lib/performance'
import { getHistory } from '../../lib/deploy-history'
import { getSystemInfo, getBackupInfo } from '../../lib/system-info'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Alle Daten generisch sammeln — keine manuellen Feld-Mappings
    const projects = getProjects().map(p => ({
      ...p,
      performanceScore: p.performanceCheckEnabled !== false ? getLatestScore(p.id) : null
    }))

    const [system, backup] = await Promise.all([
      getSystemInfo(),
      getBackupInfo()
    ])

    const recentDeploys = getHistory(10)

    const groups = getGroups().map(g => ({
      ...g,
      projectCount: getGroupProjects(g.id).length
    }))

    res.json({
      timestamp: new Date().toISOString(),
      projects,
      groups,
      system,
      backup,
      recentDeploys
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
