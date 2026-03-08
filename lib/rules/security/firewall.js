// Firewall (ufw) — Basis-Firewall pruefen und enforcen

// Erlaubte Ports: SSH, HTTP, HTTPS, Gitea SSH, SMTP, Submission, IMAPS, Sieve
const ALLOWED_PORTS = ['22', '80', '443', '222', '25', '587', '993', '4190']

export default [
  {
    id: 'ufw-active',
    name: 'Firewall aktiv',
    category: 'security',
    scope: 'server',
    severity: 'critical',

    async audit({ runCmd }) {
      const output = await runCmd('sudo ufw status')
      const active = output.includes('Status: active') || output.includes('Status: aktiv')
      return {
        passed: active,
        actual: output.split('\n')[0]?.trim() || 'Unbekannt',
        expected: 'Status: active',
      }
    },

    async enforce({ runCmd }) {
      // ufw installieren falls noetig
      await runCmd('sudo apt-get install -y -qq ufw 2>/dev/null || true', { timeout: 30000 })
      // Standard-Ports oeffnen bevor Firewall aktiviert wird (Lockout verhindern)
      for (const port of ALLOWED_PORTS) {
        await runCmd(`sudo ufw allow ${port}/tcp`)
      }
      await runCmd('sudo ufw default deny incoming')
      await runCmd('sudo ufw default allow outgoing')
      await runCmd('sudo ufw --force enable')
      return { changed: true }
    },
  },

  {
    id: 'ufw-default-deny',
    name: 'Default: deny incoming',
    category: 'security',
    scope: 'server',
    severity: 'critical',

    async audit({ runCmd }) {
      const output = await runCmd('sudo ufw status verbose')
      const hasDeny = output.includes('Default: deny (incoming)')
      return {
        passed: hasDeny,
        actual: hasDeny ? 'deny (incoming)' : 'Nicht deny',
        expected: 'Default: deny (incoming)',
      }
    },

    async enforce({ runCmd }) {
      await runCmd('sudo ufw default deny incoming')
      return { changed: true }
    },
  },

  {
    id: 'ufw-allowed-ports',
    name: 'Nur erlaubte Ports offen',
    category: 'security',
    scope: 'server',
    severity: 'critical',

    async audit({ runCmd }) {
      const output = await runCmd('sudo ufw status')
      const lines = output.split('\n').filter(l => l.includes('ALLOW'))
      const openPorts = lines.map(l => l.trim().split(/\s+/)[0].split('/')[0])
      const unique = [...new Set(openPorts)]
      const unexpected = unique.filter(p => !ALLOWED_PORTS.includes(p))
      return {
        passed: unexpected.length === 0,
        actual: unexpected.length ? `Unerwartete Ports: ${unexpected.join(', ')}` : `OK (${unique.join(', ')})`,
        expected: `Nur Ports: ${ALLOWED_PORTS.join(', ')}`,
      }
    },
    // Ports automatisch oeffnen/schliessen ist zu riskant
    enforce: null,
  },
]
