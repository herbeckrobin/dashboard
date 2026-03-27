// CRUD API fuer Projekt-Cronjobs
import { requireAuth } from '../../../../../lib/auth'
import { getProject, updateProject } from '../../../../../lib/db'
import { validateCronSchedule, validateCronCommand, validateCronUrl, validateCronHeaders, validateCronJobCount } from '../../../../../lib/validate'
import { syncProjectCrons } from '../../../../../lib/cron-sync'
import { getCronRuns } from '../../../../../lib/cron-log'

export default async function handler(req, res) {
  const authed = await requireAuth(req, res)
  if (!authed) return

  const { id } = req.query
  const project = getProject(id)
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' })

  // GET — Cron-Jobs mit letzten Runs auflisten
  if (req.method === 'GET') {
    const cronJobs = project.cronJobs || []
    const runs = getCronRuns(id, null, 50)
    return res.json({ cronJobs, runs })
  }

  // POST — Neuen Cron-Job anlegen
  if (req.method === 'POST') {
    const existing = project.cronJobs || []
    const countCheck = validateCronJobCount(existing.length)
    if (!countCheck.valid) return res.status(400).json({ error: countCheck.error })

    const { name, type, schedule, command, url, httpMethod, headers } = req.body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name ist erforderlich' })
    }
    if (name.length > 100) {
      return res.status(400).json({ error: 'Name darf maximal 100 Zeichen lang sein' })
    }
    if (!['command', 'url'].includes(type)) {
      return res.status(400).json({ error: 'Typ muss "command" oder "url" sein' })
    }

    const scheduleCheck = validateCronSchedule(schedule)
    if (!scheduleCheck.valid) return res.status(400).json({ error: scheduleCheck.error })

    if (type === 'command') {
      const cmdCheck = validateCronCommand(command)
      if (!cmdCheck.valid) return res.status(400).json({ error: cmdCheck.error })
    }
    if (type === 'url') {
      const urlCheck = validateCronUrl(url)
      if (!urlCheck.valid) return res.status(400).json({ error: urlCheck.error })
      if (httpMethod && !['GET', 'POST'].includes(httpMethod)) {
        return res.status(400).json({ error: 'HTTP-Methode muss GET oder POST sein' })
      }
      if (headers) {
        const headersCheck = validateCronHeaders(headers)
        if (!headersCheck.valid) return res.status(400).json({ error: headersCheck.error })
      }
    }

    const cleanHeaders = type === 'url' && Array.isArray(headers)
      ? headers.filter(h => h.key && h.key.trim()).map(h => ({ key: h.key.trim(), value: (h.value || '').trim() }))
      : null

    const cronJob = {
      id: `cj_${Date.now()}`,
      name: name.trim(),
      type,
      schedule: schedule.trim(),
      command: type === 'command' ? command.trim() : null,
      url: type === 'url' ? url.trim() : null,
      httpMethod: type === 'url' ? (httpMethod || 'GET') : null,
      headers: cleanHeaders,
      enabled: true,
      createdAt: new Date().toISOString(),
      lastRunAt: null,
      lastRunStatus: null,
    }

    const updated = updateProject(id, { cronJobs: [...existing, cronJob] })
    await syncProjectCrons(id)
    return res.json({ success: true, cronJob, project: updated })
  }

  // PUT — Cron-Job aktualisieren
  if (req.method === 'PUT') {
    const { cronJobId, name, type, schedule, command, url, httpMethod, headers, enabled } = req.body
    if (!cronJobId) return res.status(400).json({ error: 'cronJobId ist erforderlich' })

    const existing = project.cronJobs || []
    const index = existing.findIndex(j => j.id === cronJobId)
    if (index === -1) return res.status(404).json({ error: 'Cron-Job nicht gefunden' })

    const job = { ...existing[index] }

    if (name !== undefined) {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Name ist erforderlich' })
      }
      if (name.length > 100) {
        return res.status(400).json({ error: 'Name darf maximal 100 Zeichen lang sein' })
      }
      job.name = name.trim()
    }

    if (type !== undefined) {
      if (!['command', 'url'].includes(type)) {
        return res.status(400).json({ error: 'Typ muss "command" oder "url" sein' })
      }
      job.type = type
    }

    if (schedule !== undefined) {
      const scheduleCheck = validateCronSchedule(schedule)
      if (!scheduleCheck.valid) return res.status(400).json({ error: scheduleCheck.error })
      job.schedule = schedule.trim()
    }

    if (command !== undefined) {
      const cmdCheck = validateCronCommand(command)
      if (!cmdCheck.valid) return res.status(400).json({ error: cmdCheck.error })
      job.command = command.trim()
    }

    if (url !== undefined) {
      const urlCheck = validateCronUrl(url)
      if (!urlCheck.valid) return res.status(400).json({ error: urlCheck.error })
      job.url = url.trim()
    }

    if (httpMethod !== undefined) {
      if (!['GET', 'POST'].includes(httpMethod)) {
        return res.status(400).json({ error: 'HTTP-Methode muss GET oder POST sein' })
      }
      job.httpMethod = httpMethod
    }

    if (headers !== undefined) {
      const headersCheck = validateCronHeaders(headers)
      if (!headersCheck.valid) return res.status(400).json({ error: headersCheck.error })
      job.headers = Array.isArray(headers)
        ? headers.filter(h => h.key && h.key.trim()).map(h => ({ key: h.key.trim(), value: (h.value || '').trim() }))
        : null
    }

    if (enabled !== undefined) {
      job.enabled = !!enabled
    }

    // Typ-spezifische Felder bereinigen
    if (job.type === 'command') {
      job.url = null
      job.httpMethod = null
      job.headers = null
    } else {
      job.command = null
    }

    const updatedJobs = [...existing]
    updatedJobs[index] = job
    const updated = updateProject(id, { cronJobs: updatedJobs })
    await syncProjectCrons(id)
    return res.json({ success: true, cronJob: job, project: updated })
  }

  // DELETE — Cron-Job loeschen
  if (req.method === 'DELETE') {
    const { cronJobId } = req.body
    if (!cronJobId) return res.status(400).json({ error: 'cronJobId ist erforderlich' })

    const existing = project.cronJobs || []
    const filtered = existing.filter(j => j.id !== cronJobId)
    if (filtered.length === existing.length) {
      return res.status(404).json({ error: 'Cron-Job nicht gefunden' })
    }

    const updated = updateProject(id, { cronJobs: filtered })
    await syncProjectCrons(id)
    return res.json({ success: true, project: updated })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
