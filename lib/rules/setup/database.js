// Datenbank Setup-Rules

export default [
  {
    id: 'project-database',
    name: 'Projekt-Datenbank existiert',
    category: 'setup',
    order: 10,
    scope: 'project',
    severity: 'critical',
    frameworks: ['wordpress', 'redaxo', 'typo3', 'contao', 'laravel'],

    async audit({ project, runCmd }) {
      if (!project.database?.name) return { passed: true, actual: 'Keine DB konfiguriert', expected: '-' }
      const result = await runCmd(
        `echo "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='${project.database.name}'" | sudo mysql -N 2>/dev/null`
      )
      return {
        passed: result.trim() === project.database.name,
        actual: result.trim() ? 'Existiert' : 'Fehlt',
        expected: `Datenbank ${project.database.name}`,
      }
    },

    async enforce({ project, runCmd, sanitizeSqlIdentifier, escapeSqlValue }) {
      const db = project.database
      const safeName = sanitizeSqlIdentifier(db.name)
      const safeUser = sanitizeSqlIdentifier(db.user)
      const safePwd = escapeSqlValue(db.password)

      const sql = `CREATE DATABASE IF NOT EXISTS \\\`${safeName}\\\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS '${safeUser}'@'localhost' IDENTIFIED BY ${safePwd}; GRANT ALL PRIVILEGES ON \\\`${safeName}\\\`.* TO '${safeUser}'@'localhost'; FLUSH PRIVILEGES;`
      await runCmd(`echo "${sql}" | sudo mysql`)
      return { changed: true }
    },
  },
]
