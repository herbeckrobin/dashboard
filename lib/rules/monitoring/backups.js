// Backup-Ueberwachung

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
        // Backup-Verzeichnisse ohne tar.gz — vielleicht Ordner-basiert?
        const dirs = await runCmd('ls -dt /home/deploy/backups/20*/ 2>/dev/null | head -1')
        if (!dirs.trim()) {
          return { passed: false, actual: 'Keine Backups gefunden', expected: 'Backup <24h alt' }
        }
        const mtime = await runCmd(`stat -c "%Y" ${dirs.trim()}`)
        const ageHours = Math.floor((Date.now() / 1000 - parseInt(mtime.trim())) / 3600)
        return {
          passed: ageHours < 24,
          actual: `${ageHours}h alt (Ordner)`,
          expected: '<24h alt',
        }
      }
      const mtime = await runCmd(`stat -c "%Y" ${output.trim()}`)
      const ageHours = Math.floor((Date.now() / 1000 - parseInt(mtime.trim())) / 3600)
      return {
        passed: ageHours < 24,
        actual: `${ageHours}h alt`,
        expected: '<24h alt',
      }
    },

    async enforce({ runCmd }) {
      // Backup-Script ausfuehren falls vorhanden
      const exists = (await runCmd('test -x /home/deploy/backups/backup.sh && echo yes || echo no')).trim()
      if (exists !== 'yes') {
        throw new Error('backup.sh nicht vorhanden oder nicht ausfuehrbar — erst backup-system-configured enforcen')
      }
      await runCmd('/home/deploy/backups/backup.sh', { timeout: 300000 })
      return { changed: true }
    },
  },

  {
    id: 'backup-valid',
    name: 'Backup-Datei nicht leer (>1MB)',
    category: 'monitoring',
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      // tar.gz Backups pruefen
      const tarFile = (await runCmd('ls -t /home/deploy/backups/*.tar.gz 2>/dev/null | head -1')).trim()
      if (tarFile) {
        const size = await runCmd(`stat -c "%s" ${tarFile}`)
        const sizeBytes = parseInt(size.trim()) || 0
        const sizeMB = Math.round(sizeBytes / 1024 / 1024)
        return {
          passed: sizeBytes > 1048576,
          actual: `${sizeMB} MB`,
          expected: '>1 MB',
        }
      }
      // Ordner-basierte Backups pruefen (Gesamtgroesse)
      const dir = (await runCmd('ls -dt /home/deploy/backups/20*/ 2>/dev/null | head -1')).trim()
      if (!dir) {
        return { passed: false, actual: 'Keine Backups gefunden', expected: '>1MB' }
      }
      const size = await runCmd(`du -sb ${dir} | cut -f1`)
      const sizeBytes = parseInt(size.trim()) || 0
      const sizeMB = Math.round(sizeBytes / 1024 / 1024)
      return {
        passed: sizeBytes > 1048576,
        actual: `${sizeMB} MB`,
        expected: '>1 MB',
      }
    },
    // Wird ueber backup-recent enforce geloest (Script ausfuehren)
    enforce: null,
  },
]
