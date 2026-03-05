// API-Endpoint: Rechtliche Dokumente als druckoptimiertes HTML
// GET /api/legal/avv?projectId=123
// GET /api/legal/tom?projectId=123
// GET /api/legal/backup?projectId=123

import { requireAuth } from '../../../lib/auth.js'
import { getProject } from '../../../lib/db.js'
import { getLegalDoc, renderLegalHtml, buildPrintPage } from '../../../lib/legal-docs.js'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { docType, projectId } = req.query

  if (!['avv', 'tom', 'backup'].includes(docType)) {
    return res.status(404).json({ error: 'Dokument nicht gefunden' })
  }

  if (!projectId) {
    return res.status(400).json({ error: 'projectId erforderlich' })
  }

  const project = getProject(projectId)
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' })

  const doc = getLegalDoc(docType)
  if (!doc) return res.status(404).json({ error: 'Dokument-Template nicht gefunden' })

  const datum = new Date().toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })

  const contentHtml = renderLegalHtml(doc.markdown)
  const html = buildPrintPage(doc.title, project.domain, datum, contentHtml)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
}
