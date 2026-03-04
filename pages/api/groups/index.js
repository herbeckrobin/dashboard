import { requireAuth } from '../../../lib/auth'
import { getGroups, addGroup, getGroupProjects } from '../../../lib/db'
import { getPackage } from '../../../lib/packages'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return

  if (req.method === 'GET') {
    const groups = getGroups().map(g => ({
      ...g,
      projectCount: getGroupProjects(g.id).length
    }))
    return res.json({ groups })
  }

  if (req.method === 'POST') {
    const { name, package: packageId, notes } = req.body
    if (!name || !packageId) {
      return res.status(400).json({ error: 'Name und Paket sind erforderlich' })
    }

    const pkg = getPackage(packageId)
    if (!pkg) {
      return res.status(400).json({ error: 'Ungueltiges Paket' })
    }

    const group = addGroup({
      name,
      package: packageId,
      limits: JSON.parse(JSON.stringify(pkg.limits)),
      extraStorage: 0,
      notes: notes || ''
    })

    return res.json({ success: true, group })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
