import { requireAuth } from '../../../../lib/auth'
import { getGroup, updateGroup, deleteGroup, getGroupProjects, updateProject } from '../../../../lib/db'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return
  const { id } = req.query

  if (req.method === 'GET') {
    const group = getGroup(id)
    if (!group) return res.status(404).json({ error: 'Gruppe nicht gefunden' })
    const projects = getGroupProjects(id)
    return res.json({ group, projects })
  }

  if (req.method === 'PUT') {
    const group = getGroup(id)
    if (!group) return res.status(404).json({ error: 'Gruppe nicht gefunden' })

    const { name, limits, extraStorage, notes } = req.body
    const updates = {}
    if (name !== undefined) updates.name = name
    if (limits !== undefined) updates.limits = limits
    if (extraStorage !== undefined) updates.extraStorage = extraStorage
    if (notes !== undefined) updates.notes = notes

    const updated = updateGroup(id, updates)
    return res.json({ success: true, group: updated })
  }

  if (req.method === 'DELETE') {
    const group = getGroup(id)
    if (!group) return res.status(404).json({ error: 'Gruppe nicht gefunden' })

    // Projekte aus Gruppe entfernen (nicht loeschen)
    const projects = getGroupProjects(id)
    for (const p of projects) {
      updateProject(p.id, { groupId: undefined })
    }

    const deleted = deleteGroup(id)
    return res.json({ success: true, group: deleted })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
