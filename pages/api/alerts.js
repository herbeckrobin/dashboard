import { requireAuth } from '../../lib/auth'
import { getProjects } from '../../lib/db'
import { getLatestScore } from '../../lib/performance'
import { getSystemInfo, getBackupInfo } from '../../lib/system-info'
import { getMailQueue } from '../../lib/email/server'
import { getLastAudit } from '../../lib/rules/storage'
import { detectDrift } from '../../lib/rules/drift'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const alerts = []
    const projects = getProjects()

    // Projekt-bezogene Alerts
    for (const p of projects) {
      // Status error
      if (p.status === 'error') {
        alerts.push({ type: 'status', severity: 'critical', project: p.name, message: `Projekt-Status: error${p.error ? ' — ' + p.error : ''}` })
      }

      // Performance-Monitoring deaktiviert → keine Performance/WebCheck/SSL-Alerts
      if (p.performanceCheckEnabled === false) continue

      const score = getLatestScore(p.id)
      if (score) {
        // Performance Score
        const perf = score.pagespeed?.performance ?? score.lighthouse?.performance ?? null
        if (perf !== null && perf < 50) {
          alerts.push({ type: 'performance', severity: perf < 30 ? 'critical' : 'warning', project: p.name, message: `Performance Score ${perf}`, value: perf })
        }

        // Website Standards Score
        const wc = score.websiteChecks?.score ?? null
        if (wc !== null && wc < 50) {
          alerts.push({ type: 'websiteChecks', severity: wc < 30 ? 'critical' : 'warning', project: p.name, message: `Website Standards ${wc}%`, value: wc })
        }

        // SSL Ablauf
        const sslCheck = score.websiteChecks?.categories?.ssl?.checks?.find(c => c.name === 'SSL-Zertifikat')
        if (sslCheck?.info) {
          const match = sslCheck.info.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
          if (match) {
            const expiry = new Date(`${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`)
            const daysLeft = Math.floor((expiry - Date.now()) / 86400000)
            if (daysLeft < 30) {
              alerts.push({ type: 'ssl', severity: daysLeft < 7 ? 'critical' : 'warning', project: p.name, message: `SSL läuft in ${daysLeft} Tagen ab`, daysLeft })
            }
          }
        }
      }
    }

    // System Alerts
    const system = await getSystemInfo()

    // Disk
    if (system.disk.percent > 80) {
      alerts.push({ type: 'disk', severity: system.disk.percent > 90 ? 'critical' : 'warning', message: `Festplatte ${system.disk.percent}% belegt` })
    }

    // RAM
    const ramPercent = system.ram.total ? Math.round((system.ram.used / system.ram.total) * 100) : 0
    if (ramPercent > 85) {
      alerts.push({ type: 'ram', severity: ramPercent > 95 ? 'critical' : 'warning', message: `RAM ${ramPercent}% belegt` })
    }

    // Services
    for (const s of system.services) {
      if (!s.active) {
        alerts.push({ type: 'service', severity: 'critical', message: `Service ${s.name} nicht aktiv` })
      }
    }

    // Backup
    const backup = await getBackupInfo()
    if (backup.lastBackup?.date) {
      const parts = backup.lastBackup.date.split('_')
      if (parts.length >= 2) {
        const backupDate = new Date(parts[0] + 'T' + parts[1].replace(/-/g, ':'))
        const hoursAgo = (Date.now() - backupDate.getTime()) / 3600000
        if (hoursAgo > 48) {
          alerts.push({ type: 'backup', severity: 'critical', message: `Letztes Backup vor ${Math.round(hoursAgo)}h (älter als 48h)` })
        }
      }
    } else {
      alerts.push({ type: 'backup', severity: 'critical', message: 'Kein Backup gefunden' })
    }

    // Mail-Queue pruefen
    try {
      const mailQueue = await getMailQueue()
      if (mailQueue.length > 100) {
        alerts.push({ type: 'mail-queue', severity: 'warning', message: `Mail-Queue: ${mailQueue.length} Nachrichten warten` })
      }
      if (mailQueue.length > 500) {
        alerts.push({ type: 'mail-queue', severity: 'critical', message: `Mail-Queue kritisch: ${mailQueue.length} Nachrichten` })
      }
    } catch {}

    // Security Rules Alerts
    const lastAudit = getLastAudit()
    if (lastAudit) {
      const SEVERITY_MAP = { critical: 'critical', high: 'warning', medium: 'info' }
      for (const r of lastAudit.results) {
        if (!r.passed && (r.severity === 'critical' || r.severity === 'high')) {
          alerts.push({
            type: 'security-rule',
            severity: SEVERITY_MAP[r.severity] || 'warning',
            message: `${r.name}: ${r.actual}`,
            ruleId: r.ruleId,
            project: r.projectName || undefined,
          })
        }
      }

      // Drift — passed→failed seit letztem Audit
      const { drifted } = detectDrift()
      for (const r of drifted) {
        alerts.push({
          type: 'security-drift',
          severity: 'warning',
          message: `Verschlechtert: ${r.name}`,
          ruleId: r.ruleId,
          project: r.projectName || undefined,
        })
      }
    }

    const summary = {
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length
    }

    res.json({ alerts, summary })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
