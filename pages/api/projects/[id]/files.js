import { requireAuth } from '../../../../lib/auth'
import fs from 'fs'
import path from 'path'
import { getProject } from '../../../../lib/db'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query
  const filePath = req.query.path || ''

  const project = getProject(id)
  if (!project) {
    return res.status(404).json({ error: 'Projekt nicht gefunden' })
  }

  const projectRoot = `/home/deploy/apps/${project.name}`
  const targetPath = path.join(projectRoot, filePath)

  // Sicherheitscheck: Pfad darf nicht aus dem Projektverzeichnis rausgehen
  if (!targetPath.startsWith(projectRoot)) {
    return res.status(403).json({ error: 'Zugriff verweigert' })
  }

  try {
    const stat = fs.statSync(targetPath)

    if (stat.isDirectory()) {
      const entries = fs.readdirSync(targetPath, { withFileTypes: true })

      const items = entries
        .filter(e => !e.name.startsWith('.') || e.name === '.env.example' || e.name === '.gitignore')
        .map(e => ({
          name: e.name,
          isDir: e.isDirectory(),
          size: e.isDirectory() ? null : fs.statSync(path.join(targetPath, e.name)).size,
        }))
        .sort((a, b) => {
          if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
          return a.name.localeCompare(b.name)
        })

      return res.json({ type: 'directory', path: filePath, items })
    }

    // Datei lesen (max 500KB)
    if (stat.size > 500000) {
      return res.json({ type: 'file', path: filePath, content: null, tooLarge: true, size: stat.size })
    }

    const content = fs.readFileSync(targetPath, 'utf8')
    return res.json({ type: 'file', path: filePath, content, size: stat.size })
  } catch (e) {
    if (e.code === 'ENOENT') {
      return res.status(404).json({ error: 'Datei oder Verzeichnis nicht gefunden' })
    }
    return res.status(500).json({ error: e.message })
  }
}
