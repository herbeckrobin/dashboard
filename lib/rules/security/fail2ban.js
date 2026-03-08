// Fail2ban Brute-Force-Schutz

export default [
  {
    id: 'f2b-running',
    name: 'Fail2ban Service laeuft',
    category: 'security',
    scope: 'server',
    severity: 'critical',

    async audit({ runQuick }) {
      const status = await runQuick('systemctl is-active fail2ban')
      return {
        passed: status === 'active',
        actual: status || 'nicht installiert',
        expected: 'active',
      }
    },

    async enforce({ runCmd }) {
      await runCmd('sudo systemctl start fail2ban && sudo systemctl enable fail2ban')
      return { changed: true }
    },
  },

  {
    id: 'f2b-ssh-jail',
    name: 'SSH-Jail aktiv',
    category: 'security',
    scope: 'server',
    severity: 'critical',

    async audit({ runCmd }) {
      const output = await runCmd('sudo fail2ban-client status sshd 2>/dev/null')
      const active = output.includes('Status for the jail: sshd')
      return {
        passed: active,
        actual: active ? 'sshd Jail aktiv' : 'sshd Jail nicht gefunden',
        expected: 'sshd Jail aktiv',
      }
    },
    enforce: null,
  },

  {
    id: 'f2b-max-retry',
    name: 'Fail2ban maxretry ≤ 5',
    category: 'security',
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      // jail.local oder jail.d/ pruefen
      const output = await runCmd('grep -E "^maxretry" /etc/fail2ban/jail.local 2>/dev/null || grep -rE "^maxretry" /etc/fail2ban/jail.d/ 2>/dev/null')
      const match = output.match(/maxretry\s*=\s*(\d+)/)
      const retries = match ? parseInt(match[1]) : 5 // Default: 5
      return {
        passed: retries <= 5,
        actual: `maxretry = ${retries}`,
        expected: 'maxretry ≤ 5',
      }
    },
    enforce: null,
  },

  {
    id: 'f2b-ban-time',
    name: 'Fail2ban bantime ≥ 1h',
    category: 'security',
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      const output = await runCmd('grep -E "^bantime" /etc/fail2ban/jail.local 2>/dev/null || grep -rE "^bantime" /etc/fail2ban/jail.d/ 2>/dev/null')
      const match = output.match(/bantime\s*=\s*(\d+)/)
      const bantime = match ? parseInt(match[1]) : 600 // Default: 600s
      return {
        passed: bantime >= 3600,
        actual: `bantime = ${bantime}s (${Math.round(bantime / 60)} min)`,
        expected: 'bantime ≥ 3600s (1h)',
      }
    },
    enforce: null,
  },
]
