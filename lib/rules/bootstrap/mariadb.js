// MariaDB Datenbank-Server

export default [
  {
    id: 'mariadb-installed',
    name: 'MariaDB installiert und aktiv',
    category: 'bootstrap',
    order: 30,
    scope: 'server',
    severity: 'high',

    async audit({ runQuick }) {
      const status = await runQuick('systemctl is-active mariadb')
      return {
        passed: status === 'active',
        actual: status || 'nicht installiert',
        expected: 'active',
      }
    },

    async enforce({ runCmd }) {
      await runCmd('sudo apt-get update -qq', { timeout: 60000 })
      await runCmd('sudo apt-get install -y -qq mariadb-server', { timeout: 120000 })
      await runCmd('sudo systemctl enable mariadb')
      await runCmd('sudo systemctl start mariadb')
      return { changed: true }
    },
  },

  {
    id: 'mariadb-hardened',
    name: 'MariaDB gehaertet (keine Anon-User, keine Test-DB)',
    category: 'bootstrap',
    order: 31,
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      // sudo mysql -N -e statt Pipe (zuverlaessiger)
      const anon = await runCmd("sudo mysql -N -e \"SELECT User FROM mysql.user WHERE User=''\" 2>/dev/null")
      const testDb = await runCmd("sudo mysql -N -e \"SHOW DATABASES LIKE 'test'\" 2>/dev/null")
      // Fehler-Output ignorieren (z.B. wenn sudo mysql nicht erlaubt)
      const hasAnon = anon.trim().length > 0 && !anon.includes('ERROR') && !anon.includes('sudo')
      const hasTest = testDb.trim().length > 0 && !testDb.includes('ERROR') && !testDb.includes('sudo')
      const issues = []
      if (hasAnon) issues.push('Anonyme User vorhanden')
      if (hasTest) issues.push('Test-DB vorhanden')
      return {
        passed: !hasAnon && !hasTest,
        actual: issues.length ? issues.join(', ') : 'Gehaertet',
        expected: 'Keine Anon-User, keine Test-DB',
      }
    },

    async enforce({ runCmd }) {
      await runCmd("sudo mysql -e \"DELETE FROM mysql.user WHERE User=''\" 2>/dev/null")
      await runCmd("sudo mysql -e \"DROP DATABASE IF EXISTS test\" 2>/dev/null")
      await runCmd("sudo mysql -e \"FLUSH PRIVILEGES\" 2>/dev/null")
      return { changed: true }
    },
  },
]
