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
      // Nur Ports flaggen die von "Anywhere" erreichbar sind,
      // nicht Ports die auf ein Subnet beschraenkt sind (z.B. Docker 172.18.0.0/16)
      const publicLines = lines.filter(l => l.includes('Anywhere') || !l.match(/\d+\.\d+\.\d+\.\d+/))
      const openPorts = publicLines.map(l => l.trim().split(/\s+/)[0].split('/')[0])
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

  {
    id: 'app-ports-not-exposed',
    name: 'App-Ports nicht extern erreichbar (nur 127.0.0.1)',
    category: 'security',
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      // Pruefen ob interne Services auf 0.0.0.0 lauschen statt 127.0.0.1
      // Ports die nur per nginx-Proxy erreichbar sein sollten
      const INTERNAL_PORTS = ['3000', '3005', '4000', '9000']
      const output = await runCmd('ss -tlnp 2>/dev/null')
      const exposed = []
      for (const port of INTERNAL_PORTS) {
        const portLines = output.split('\n').filter(l => l.includes(`:${port} `) || l.includes(`:${port}\t`))
        for (const line of portLines) {
          if (line.includes(`0.0.0.0:${port}`) || line.includes(`*:${port}`)) {
            // Pruefen ob UFW den Port bereits blockt oder auf Subnet beschraenkt
            const ufwCheck = await runCmd(`sudo ufw status | grep "${port}/tcp"`)
            const isDenied = ufwCheck.includes('DENY')
            const isSubnetOnly = ufwCheck.includes('ALLOW') && ufwCheck.match(/\d+\.\d+\.\d+\.\d+\/\d+/) && !ufwCheck.includes('Anywhere')
            if (!isDenied && !isSubnetOnly) {
              exposed.push(port)
            }
            break
          }
        }
      }
      return {
        passed: exposed.length === 0,
        actual: exposed.length ? `Exponiert auf 0.0.0.0: ${exposed.join(', ')}` : 'Alle geschuetzt (127.0.0.1 oder UFW deny)',
        expected: 'Interne Services nur auf 127.0.0.1 oder per UFW geblockt',
      }
    },

    async enforce({ runCmd }) {
      // Exponierte interne Ports per UFW blocken
      const INTERNAL_PORTS = ['3000', '3005', '4000', '9000']
      const output = await runCmd('ss -tlnp 2>/dev/null')
      const blocked = []
      for (const port of INTERNAL_PORTS) {
        const portLines = output.split('\n').filter(l => l.includes(`:${port} `) || l.includes(`:${port}\t`))
        for (const line of portLines) {
          if (line.includes(`0.0.0.0:${port}`) || line.includes(`*:${port}`)) {
            // Port per UFW deny blocken (eingehend von extern)
            // Erlaubt weiterhin localhost-Zugriff (nginx proxy)
            await runCmd(`sudo ufw deny ${port}/tcp`)
            blocked.push(port)
            break
          }
        }
      }
      return { changed: blocked.length > 0, meta: { blocked } }
    },
  },
]
