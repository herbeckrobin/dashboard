import { requireAuth } from '../../../../lib/auth'
import { getProject } from '../../../../lib/db'
import { checkDomainDns, getServerIp } from '../../../../lib/dns'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const project = getProject(req.query.id)
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' })
  if (!project.domain) return res.status(400).json({ error: 'Keine Domain konfiguriert' })

  try {
    const serverIp = await getServerIp()
    const result = await checkDomainDns(project.domain, {
      serverIp,
      wwwAlias: project.wwwAlias
    })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: 'DNS-Abfrage fehlgeschlagen: ' + err.message })
  }
}
