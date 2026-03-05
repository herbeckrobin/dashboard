import { requireAuth } from '../../../lib/auth'
import { getProjects, addProject, updateProject, getGroups, getGroup } from '../../../lib/db'
import { deployProject, getNextPort } from '../../../lib/deploy'
import { generateDbCredentials } from '../../../lib/database'
import { getLatestScore } from '../../../lib/performance'
import { checkProjectCreationLimit, checkDomainLimit } from '../../../lib/limits'
import { validateProjectName, validateDomain } from '../../../lib/validate'

const FRAMEWORK_CONFIG = {
  wordpress: { type: 'php', needsDb: true },
  redaxo: { type: 'php', needsDb: true },
  laravel: { type: 'php', needsDb: true, docRoot: 'public' },
  typo3: { type: 'php', needsDb: true, docRoot: 'public', phpVersion: '8.3' },
  contao: { type: 'php', needsDb: true, docRoot: 'public', phpVersion: '8.3' },
  'nextjs-starter': { type: 'nextjs', needsDb: false },
  'express-starter': { type: 'node', needsDb: false },
}

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return
  if (req.method === 'GET') {
    const groups = getGroups()
    const groupMap = Object.fromEntries(groups.map(g => [g.id, g]))
    const projects = getProjects().map(p => {
      const { database, envVars, ...safe } = p
      return {
        ...safe,
        groupName: p.groupId ? groupMap[p.groupId]?.name : null,
        performanceScore: p.performanceCheckEnabled !== false ? getLatestScore(p.id) : null
      }
    })
    return res.json({ projects })
  }

  if (req.method === 'POST') {
    const { name, domain, repo, uploadLimit, phpVersion, docRoot, framework, gitMode, databaseMode, database: manualDb, aiDescription, groupId, adminOverride } = req.body
    let { type } = req.body

    if (!name || !domain || !repo) {
      return res.status(400).json({ error: 'Name, Domain und Repo sind erforderlich' })
    }

    // Eingabe-Validierung
    const nameCheck = validateProjectName(name)
    if (!nameCheck.valid) return res.status(400).json({ error: nameCheck.error })
    const domainCheck = validateDomain(domain)
    if (!domainCheck.valid) return res.status(400).json({ error: domainCheck.error })

    // Gruppen-Limit pruefen (HARD)
    if (groupId) {
      const group = getGroup(groupId)
      if (!group) {
        return res.status(400).json({ error: 'Gruppe nicht gefunden' })
      }
      if (!adminOverride) {
        const projectCheck = checkProjectCreationLimit(group)
        if (!projectCheck.allowed) {
          return res.status(400).json({ error: projectCheck.reason, limitReached: true })
        }
        const domainCheck = checkDomainLimit(group)
        if (!domainCheck.allowed) {
          return res.status(400).json({ error: domainCheck.reason, limitReached: true })
        }
      }
    }

    // Framework-Konfiguration anwenden
    const fwConfig = framework ? FRAMEWORK_CONFIG[framework] : null
    if (fwConfig) {
      type = fwConfig.type
    }

    if (!type) {
      return res.status(400).json({ error: 'Projekttyp ist erforderlich' })
    }

    // Projekt erstellen
    const port = getNextPort()
    const projectData = { name, domain, type, repo, port }
    if (groupId) projectData.groupId = groupId
    if (uploadLimit) projectData.uploadLimit = uploadLimit
    if (phpVersion) projectData.phpVersion = phpVersion

    // Framework-spezifische Felder
    if (framework) {
      projectData.framework = framework
      projectData.frameworkInstalled = false

      if (framework === 'wordpress') {
        projectData.gitMode = gitMode || 'theme-only'
        if (gitMode === 'theme-only') {
          projectData.gitSubPath = `wp-content/themes/${name}`
        }
      }

      if (fwConfig?.docRoot) {
        projectData.docRoot = fwConfig.docRoot
      } else if (docRoot) {
        projectData.docRoot = docRoot
      }

      // PHP-Version (Framework kann Mindest-Version vorgeben)
      if (fwConfig?.phpVersion && !phpVersion) {
        projectData.phpVersion = fwConfig.phpVersion
      }

      // Datenbank
      if (fwConfig?.needsDb) {
        if (databaseMode === 'manual' && manualDb) {
          projectData.database = { name: manualDb.name, user: manualDb.user, password: manualDb.password, host: manualDb.host || 'localhost' }
          projectData.databaseMode = 'manual'
        } else {
          projectData.database = generateDbCredentials(name)
          projectData.databaseMode = 'auto'
        }
      }
    } else {
      if (docRoot) projectData.docRoot = docRoot
    }

    // AI Starter Content (optional)
    if (aiDescription && typeof aiDescription === 'string' && aiDescription.trim()) {
      projectData.aiDescription = aiDescription.trim().substring(0, 1000)
    }

    const project = addProject(projectData)

    // Deployment starten (async)
    updateProject(project.id, { status: 'deploying' })

    // Deploy im Hintergrund
    deployProject(project)
      .then(result => {
        if (result.success) {
          updateProject(project.id, { status: 'running', port: result.port })
        } else {
          updateProject(project.id, { status: 'error', error: result.error })
        }
      })
      .catch(err => {
        updateProject(project.id, { status: 'error', error: err.message })
      })

    return res.json({ success: true, project })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
