// Firewall (ufw) — audit-only (Ports schliessen kann Dienste killen)

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
    enforce: null,
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
    enforce: null,
  },

  {
    id: 'ufw-allowed-ports',
    name: 'Nur erlaubte Ports offen',
    category: 'security',
    scope: 'server',
    severity: 'critical',

    async audit({ runCmd }) {
      const output = await runCmd('sudo ufw status')
      const allowedPorts = ['22', '80', '443', '222']
      const lines = output.split('\n').filter(l => l.includes('ALLOW'))
      const openPorts = lines.map(l => l.trim().split(/\s+/)[0].split('/')[0])
      const unique = [...new Set(openPorts)]
      const unexpected = unique.filter(p => !allowedPorts.includes(p))
      return {
        passed: unexpected.length === 0,
        actual: unexpected.length ? `Unerwartete Ports: ${unexpected.join(', ')}` : `OK (${unique.join(', ')})`,
        expected: `Nur Ports: ${allowedPorts.join(', ')}`,
      }
    },
    enforce: null,
  },
]
