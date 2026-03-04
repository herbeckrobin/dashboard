import { requireAuth } from '../../../../lib/auth'
import { getProject, updateProject, deleteProject } from '../../../../lib/db'
import { getConfig } from '../../../../lib/config'
import { runCommand } from '../../../../lib/run-command'
import { dropDatabase } from '../../../../lib/database'
import { deletePerformanceData } from '../../../../lib/performance'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return
  const { id } = req.query

  if (req.method === 'GET') {
    const project = getProject(id)
    if (!project) {
      return res.status(404).json({ error: 'Projekt nicht gefunden' })
    }
    return res.json({ project })
  }

  if (req.method === 'PUT') {
    const project = getProject(id)
    if (!project) {
      return res.status(404).json({ error: 'Projekt nicht gefunden' })
    }

    const { name, domain, type, repo, gitSubPath, uploadLimit, phpVersion, docRoot, frameworkInstalled, envVars, preBuildCmd, wwwAlias, performanceCheckEnabled, groupId } = req.body
    const updates = {}
    if (name !== undefined) updates.name = name
    if (domain !== undefined) {
      // Alte Domain merken fuer Cleanup beim naechsten Deploy
      if (domain !== project.domain) {
        updates.previousDomain = project.domain
      }
      updates.domain = domain
    }
    if (type !== undefined) updates.type = type
    if (repo !== undefined) updates.repo = repo
    if (gitSubPath !== undefined) updates.gitSubPath = gitSubPath
    if (uploadLimit !== undefined) updates.uploadLimit = uploadLimit
    if (phpVersion !== undefined) updates.phpVersion = phpVersion
    if (docRoot !== undefined) updates.docRoot = docRoot
    if (frameworkInstalled !== undefined) updates.frameworkInstalled = frameworkInstalled
    if (envVars !== undefined) {
      updates.envVars = Array.isArray(envVars)
        ? envVars.filter(e => e.key && typeof e.key === 'string').map(e => ({ key: e.key.trim(), value: String(e.value || '') }))
        : []
    }
    if (preBuildCmd !== undefined) updates.preBuildCmd = typeof preBuildCmd === 'string' ? preBuildCmd.trim() : ''
    if (wwwAlias !== undefined) updates.wwwAlias = !!wwwAlias
    if (performanceCheckEnabled !== undefined) {
      updates.performanceCheckEnabled = !!performanceCheckEnabled
      // Performance-Daten loeschen wenn deaktiviert
      if (!performanceCheckEnabled && project.performanceCheckEnabled !== false) {
        deletePerformanceData(id)
      }
    }
    if (groupId !== undefined) {
      updates.groupId = groupId || undefined
    }
    const updated = updateProject(id, updates)
    return res.json({ success: true, project: updated })
  }

  if (req.method === 'DELETE') {
    const project = getProject(id)
    if (!project) {
      return res.status(404).json({ error: 'Projekt nicht gefunden' })
    }

    const { name, domain, type } = project
    const { deleteRepo } = req.body || {}
    const projectPath = `/home/deploy/apps/${name}`

    // 1. PM2 Prozess stoppen + Port freigeben (nur Node/Next.js)
    if (type === 'nextjs' || type === 'node') {
      await runCommand(`pm2 delete ${name} 2>/dev/null; pm2 save`)
      // Sicherheitshalber Prozess auf dem Port killen (falls nicht via PM2 verwaltet)
      if (project.port) {
        await runCommand(`fuser -k ${project.port}/tcp 2>/dev/null || true`)
      }
    }

    // 2. nginx Config entfernen
    await runCommand(`sudo rm -f /etc/nginx/sites-enabled/${domain} /etc/nginx/sites-available/${domain}`)
    await runCommand(`sudo nginx -t && sudo systemctl reload nginx`)

    // 3. App-Verzeichnis loeschen
    await runCommand(`rm -rf ${projectPath}`)

    // 4. Optional: Gitea Repo loeschen
    if (deleteRepo && project.repo) {
      const config = getConfig()
      const token = config.giteaToken
      if (token) {
        try {
          const giteaRes = await fetch(`http://localhost:3000/api/v1/repos/${project.repo}?token=${encodeURIComponent(token)}`, {
            method: 'DELETE'
          })
          if (!giteaRes.ok) {
            const err = await giteaRes.text()
            console.error('Gitea repo delete failed:', err)
          }
        } catch (e) {
          console.error('Gitea repo delete error:', e.message)
        }
      }
    }

    // 5. MariaDB Datenbank loeschen (wenn vorhanden)
    if (project.database) {
      try {
        await dropDatabase(project.database)
      } catch (e) {
        console.error('DB drop error:', e.message)
      }
    }

    // 6. Aus Datenbank loeschen
    const deleted = deleteProject(id)
    return res.json({ success: true, project: deleted })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
