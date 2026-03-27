// Cron-Job ausfuehren (manuell oder per Crontab-Trigger)
import { requireAuth } from '../../../../../lib/auth'
import { getProject, updateProject } from '../../../../../lib/db'
import { runCommand } from '../../../../../lib/run-command'
import { escapeShellArg } from '../../../../../lib/validate'
import { addCronRun } from '../../../../../lib/cron-log'
import { getCronSecret } from '../../../../../lib/cron-sync'

const COMMAND_TIMEOUT = 60000 // 60s
const URL_TIMEOUT = 30000 // 30s

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query
  const { cronJobId, trigger = 'manual' } = req.body || {}

  // Auth: Session fuer manuell, cronSecret fuer automatisch
  if (trigger === 'cron') {
    const secret = req.headers['x-cron-secret']
    const expectedSecret = getCronSecret()
    if (!secret || secret !== expectedSecret) {
      return res.status(401).json({ error: 'Ungueltig' })
    }
  } else {
    const authed = await requireAuth(req, res)
    if (!authed) return
  }

  const project = getProject(id)
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' })

  const cronJobs = project.cronJobs || []
  const job = cronJobs.find(j => j.id === cronJobId)
  if (!job) return res.status(404).json({ error: 'Cron-Job nicht gefunden' })

  const startedAt = new Date().toISOString()
  let status = 'success'
  let output = ''

  try {
    if (job.type === 'command') {
      const projectPath = `/home/deploy/www/${project.name}`
      const cmd = `sudo -u deploy bash -c ${escapeShellArg(`cd ${projectPath} && ${job.command}`)}`
      const result = await runCommand(cmd, COMMAND_TIMEOUT)
      output = result.success ? (result.output || '') : (result.error || 'Fehler')
      status = result.success ? 'success' : 'error'
    } else if (job.type === 'url') {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), URL_TIMEOUT)
      try {
        const fetchOptions = {
          method: job.httpMethod || 'GET',
          signal: controller.signal,
          headers: { 'User-Agent': 'Dashboard-Cron/1.0' },
        }
        const response = await fetch(job.url, fetchOptions)
        const body = await response.text()
        output = `HTTP ${response.status} ${response.statusText}\n${body}`.trim()
        status = response.ok ? 'success' : 'error'
      } catch (e) {
        output = e.name === 'AbortError' ? `Timeout nach ${URL_TIMEOUT / 1000}s` : e.message
        status = 'error'
      } finally {
        clearTimeout(timeout)
      }
    }
  } catch (e) {
    output = e.message || 'Unbekannter Fehler'
    status = 'error'
  }

  const finishedAt = new Date().toISOString()
  const durationMs = new Date(finishedAt) - new Date(startedAt)

  // Log-Eintrag speichern
  addCronRun(id, {
    cronJobId: job.id,
    cronJobName: job.name,
    startedAt,
    finishedAt,
    durationMs,
    status,
    output,
    trigger,
  })

  // lastRun im Projekt aktualisieren
  const updatedJobs = cronJobs.map(j =>
    j.id === job.id ? { ...j, lastRunAt: finishedAt, lastRunStatus: status } : j
  )
  updateProject(id, { cronJobs: updatedJobs })

  return res.json({ success: status === 'success', status, output, durationMs })
}
