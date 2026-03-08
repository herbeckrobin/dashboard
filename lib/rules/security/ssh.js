// SSH-Haertung — alle Rules sind audit-only (zu riskant automatisch)

export default [
  {
    id: 'ssh-root-key-only',
    name: 'SSH Root Login nur mit Key',
    category: 'security',
    scope: 'server',
    severity: 'critical',

    async audit({ runCmd }) {
      const output = await runCmd('grep -E "^PermitRootLogin" /etc/ssh/sshd_config')
      return {
        passed: output.includes('prohibit-password'),
        actual: output.trim() || 'Nicht gesetzt',
        expected: 'PermitRootLogin prohibit-password',
      }
    },
    enforce: null,
  },

  {
    id: 'ssh-password-disabled',
    name: 'SSH Passwort-Auth deaktiviert',
    category: 'security',
    scope: 'server',
    severity: 'critical',

    async audit({ runCmd }) {
      const output = await runCmd('grep -E "^PasswordAuthentication" /etc/ssh/sshd_config')
      return {
        passed: output.includes('no'),
        actual: output.trim() || 'Nicht gesetzt (Default: yes)',
        expected: 'PasswordAuthentication no',
      }
    },
    enforce: null,
  },

  {
    id: 'ssh-empty-passwords',
    name: 'Leere Passwoerter verboten',
    category: 'security',
    scope: 'server',
    severity: 'critical',

    async audit({ runCmd }) {
      const output = await runCmd('grep -E "^PermitEmptyPasswords" /etc/ssh/sshd_config')
      // Wenn nicht gesetzt, ist der Default "no" — also ok
      const notSet = !output.trim()
      const isNo = output.includes('no')
      return {
        passed: notSet || isNo,
        actual: output.trim() || 'Nicht gesetzt (Default: no)',
        expected: 'PermitEmptyPasswords no',
      }
    },
    enforce: null,
  },

  {
    id: 'ssh-use-dns',
    name: 'SSH UseDNS deaktiviert',
    category: 'security',
    scope: 'server',
    severity: 'medium',

    async audit({ runCmd }) {
      const output = await runCmd('grep -E "^UseDNS" /etc/ssh/sshd_config')
      return {
        passed: output.includes('no'),
        actual: output.trim() || 'Nicht gesetzt (Default: yes)',
        expected: 'UseDNS no',
      }
    },
    enforce: null,
  },

  {
    id: 'ssh-max-auth-tries',
    name: 'SSH MaxAuthTries begrenzt',
    category: 'security',
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      const output = await runCmd('grep -E "^MaxAuthTries" /etc/ssh/sshd_config')
      const match = output.match(/MaxAuthTries\s+(\d+)/)
      const tries = match ? parseInt(match[1]) : 6 // Default: 6
      return {
        passed: tries <= 3,
        actual: match ? `MaxAuthTries ${tries}` : 'Nicht gesetzt (Default: 6)',
        expected: 'MaxAuthTries ≤ 3',
      }
    },
    enforce: null,
  },
]
