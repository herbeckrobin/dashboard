import { requireAuth } from '../../../lib/auth'
import { getConfig } from '../../../lib/config'
import { getProjects } from '../../../lib/db'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return
  const config = getConfig()
  const token = config.giteaToken

  if (!token) {
    return res.status(400).json({ error: 'Gitea API Token nicht konfiguriert. Bitte unter Einstellungen setzen.' })
  }

  // GET - Repos auflisten
  if (req.method === 'GET') {
    try {
      const response = await fetch(
        `http://localhost:3000/api/v1/user/repos?limit=50`,
        { headers: { 'Authorization': `token ${token}` } }
      )

      if (!response.ok) {
        const text = await response.text()
        return res.status(response.status).json({ error: `Gitea API Fehler: ${response.status} - ${text}` })
      }

      const repos = await response.json()
      const projects = getProjects()
      const usedRepos = new Set(projects.map(p => p.repo))

      const result = repos.map(r => ({
        full_name: r.full_name,
        name: r.name,
        owner: r.owner?.login || '',
        description: r.description || '',
        private: r.private,
        empty: r.empty,
        html_url: r.html_url,
        clone_url: r.clone_url,
        used: usedRepos.has(r.full_name),
        usedBy: projects.find(p => p.repo === r.full_name)?.name || null,
        updated_at: r.updated_at,
      }))

      result.sort((a, b) => a.full_name.localeCompare(b.full_name))

      return res.json({ repos: result })
    } catch (e) {
      return res.status(500).json({ error: 'Verbindung zu Gitea fehlgeschlagen: ' + e.message })
    }
  }

  // POST - Neues Repo erstellen
  if (req.method === 'POST') {
    const { name, description, isPrivate, autoInit } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Repository-Name ist erforderlich' })
    }

    try {
      const response = await fetch(
        `http://localhost:3000/api/v1/user/repos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `token ${token}` },
          body: JSON.stringify({
            name: name.trim(),
            description: description || '',
            private: isPrivate !== false,
            auto_init: autoInit !== false,
            default_branch: 'main',
          })
        }
      )

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const msg = data.message || `Fehler ${response.status}`
        return res.status(response.status).json({ error: msg })
      }

      const repo = await response.json()

      return res.json({
        success: true,
        repo: {
          full_name: repo.full_name,
          name: repo.name,
          owner: repo.owner?.login || '',
          description: repo.description || '',
          private: repo.private,
          empty: repo.empty,
          html_url: repo.html_url,
          clone_url: repo.clone_url,
          used: false,
          usedBy: null,
          updated_at: repo.updated_at,
        }
      })
    } catch (e) {
      return res.status(500).json({ error: 'Verbindung zu Gitea fehlgeschlagen: ' + e.message })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
