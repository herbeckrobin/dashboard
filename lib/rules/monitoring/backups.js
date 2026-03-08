// Backup-Ueberwachung (audit-only)

export default [
  {
    id: 'backup-recent',
    name: 'Letztes Backup aktuell (<24h)',
    category: 'monitoring',
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      const output = await runCmd('ls -t /home/deploy/backups/*.tar.gz 2>/dev/null | head -1')
      if (!output.trim()) {
        return { passed: false, actual: 'Keine Backups gefunden', expected: 'Backup <24h alt' }
      }
      const mtime = await runCmd(`stat -c "%Y" ${output.trim()}`)
      const ageHours = Math.floor((Date.now() / 1000 - parseInt(mtime.trim())) / 3600)
      return {
        passed: ageHours < 24,
        actual: `${ageHours}h alt`,
        expected: '<24h alt',
      }
    },
    enforce: null,
  },

  {
    id: 'backup-valid',
    name: 'Backup-Datei nicht leer (>1MB)',
    category: 'monitoring',
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      const output = await runCmd('ls -t /home/deploy/backups/*.tar.gz 2>/dev/null | head -1')
      if (!output.trim()) {
        return { passed: false, actual: 'Keine Backups gefunden', expected: '>1MB' }
      }
      const size = await runCmd(`stat -c "%s" ${output.trim()}`)
      const sizeBytes = parseInt(size.trim()) || 0
      const sizeMB = Math.round(sizeBytes / 1024 / 1024)
      return {
        passed: sizeBytes > 1048576,
        actual: `${sizeMB} MB`,
        expected: '>1 MB',
      }
    },
    enforce: null,
  },
]
