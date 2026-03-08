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
      const anon = await runCmd("echo \"SELECT User FROM mysql.user WHERE User=''\" | sudo mysql -N 2>/dev/null")
      const testDb = await runCmd("echo \"SHOW DATABASES LIKE 'test'\" | sudo mysql -N 2>/dev/null")
      const hasAnon = anon.trim().length > 0
      const hasTest = testDb.trim().length > 0
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
      await runCmd("echo \"DELETE FROM mysql.user WHERE User=''\" | sudo mysql 2>/dev/null")
      await runCmd("echo \"DROP DATABASE IF EXISTS test\" | sudo mysql 2>/dev/null")
      await runCmd("echo \"FLUSH PRIVILEGES\" | sudo mysql 2>/dev/null")
      return { changed: true }
    },
  },
]
