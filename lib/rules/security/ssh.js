// SSH-Haertung — sshd_config Einstellungen pruefen und enforcen

// Hilfsfunktion: sshd_config Option setzen (idempotent)
async function setSshdOption(runCmd, option, value) {
  // Vorhandene Zeile ersetzen (auch auskommentierte)
  await runCmd(`sudo sed -i 's/^#\\?${option}.*/${option} ${value}/' /etc/ssh/sshd_config`)
  // Falls nicht vorhanden, anfuegen
  await runCmd(`grep -q '^${option}' /etc/ssh/sshd_config || echo '${option} ${value}' | sudo tee -a /etc/ssh/sshd_config > /dev/null`)
  // sshd neu starten (ssh oder sshd je nach Distro)
  await runCmd('sudo systemctl restart ssh 2>/dev/null || sudo systemctl restart sshd')
}

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

    async enforce({ runCmd }) {
      await setSshdOption(runCmd, 'PermitRootLogin', 'prohibit-password')
      return { changed: true }
    },
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

    async enforce({ runCmd }) {
      await setSshdOption(runCmd, 'PasswordAuthentication', 'no')
      return { changed: true }
    },
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

    async enforce({ runCmd }) {
      await setSshdOption(runCmd, 'PermitEmptyPasswords', 'no')
      return { changed: true }
    },
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

    async enforce({ runCmd }) {
      await setSshdOption(runCmd, 'UseDNS', 'no')
      return { changed: true }
    },
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

    async enforce({ runCmd }) {
      await setSshdOption(runCmd, 'MaxAuthTries', '3')
      return { changed: true }
    },
  },

  {
    id: 'ssh-x11-forwarding',
    name: 'X11Forwarding deaktiviert',
    category: 'security',
    scope: 'server',
    severity: 'medium',

    async audit({ runCmd }) {
      const output = await runCmd('grep -E "^X11Forwarding" /etc/ssh/sshd_config')
      const isNo = output.includes('no')
      return {
        passed: isNo,
        actual: output.trim() || 'Nicht gesetzt (Default: yes)',
        expected: 'X11Forwarding no',
      }
    },

    async enforce({ runCmd }) {
      await setSshdOption(runCmd, 'X11Forwarding', 'no')
      return { changed: true }
    },
  },
]
