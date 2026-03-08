// Cron-Jobs — Backup, SSL-Retry, Performance-Recheck

export default [
  {
    id: 'cron-jobs-configured',
    name: 'Cron-Jobs eingerichtet (Backup, SSL, Performance)',
    category: 'bootstrap',
    order: 90,
    scope: 'server',
    severity: 'medium',

    async audit({ runCmd, getConfig }) {
      const config = getConfig()
      const adminDomain = config.adminDomain || ''
      const crontab = await runCmd('sudo crontab -l 2>/dev/null')

      const checks = {
        backup: crontab.includes('backup.sh'),
        sslRetry: crontab.includes('check-www-dns'),
        performance: crontab.includes('performance-recheck'),
      }

      const missing = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k)
      return {
        passed: missing.length === 0,
        actual: missing.length ? `Fehlend: ${missing.join(', ')}` : 'Alle Cron-Jobs vorhanden',
        expected: 'backup, sslRetry, performance Cron-Jobs',
      }
    },

    async enforce({ runCmd, getConfig }) {
      const config = getConfig()
      const adminDomain = config.adminDomain
      if (!adminDomain) throw new Error('adminDomain nicht in config.json gesetzt')

      // Bestehende Crontab lesen (|| true verhindert Fehler wenn keine existiert)
      const existing = await runCmd('sudo crontab -l 2>/dev/null || true')
      const lines = []

      // Taegliches Backup um 3:00
      if (!existing.includes('backup.sh')) {
        lines.push('0 3 * * * /home/deploy/backups/backup.sh >> /var/log/backup.log 2>&1')
      }

      // SSL/DNS Retry alle 10 Minuten
      if (!existing.includes('check-www-dns')) {
        lines.push(`*/10 * * * * curl -s https://${adminDomain}/api/check-www-dns > /dev/null 2>&1`)
      }

      // Performance Recheck woechentlich Sonntag 2:00
      if (!existing.includes('performance-recheck')) {
        lines.push(`0 2 * * 0 curl -s https://${adminDomain}/api/performance-recheck > /dev/null 2>&1`)
      }

      if (lines.length > 0) {
        // Bestehende Eintraege + neue Zeilen zusammenbauen
        const existingClean = existing.replace(/no crontab for.*/gi, '').trim()
        const newCrontab = (existingClean ? existingClean + '\n' : '') + lines.join('\n') + '\n'
        const { writeFileSync } = await import('fs')
        const tmpPath = '/tmp/crontab-update'
        writeFileSync(tmpPath, newCrontab)
        await runCmd(`sudo crontab ${tmpPath}`, { throwOnError: true })
        await runCmd(`rm -f ${tmpPath}`)
      }

      return { changed: lines.length > 0 }
    },
  },
]
