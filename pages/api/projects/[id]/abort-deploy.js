import { requireAuth } from '../../../../lib/auth'
import { getProject, updateProject } from '../../../../lib/db'
import { abortDeploy } from '../../../../lib/deploy-abort'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query
  const project = getProject(id)

  if (!project) {
    return res.status(404).json({ error: 'Projekt nicht gefunden' })
  }

  const aborted = abortDeploy(id)
  if (aborted) {
    updateProject(id, { status: 'error' })
    return res.json({ success: true, message: 'Deploy wird abgebrochen' })
  }

  return res.status(400).json({ error: 'Kein aktiver Deploy gefunden' })
}
