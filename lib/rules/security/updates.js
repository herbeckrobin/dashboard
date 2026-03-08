// Automatische Sicherheitsupdates

export default [
  {
    id: 'unattended-upgrades',
    name: 'Automatische Sicherheitsupdates aktiv',
    category: 'security',
    scope: 'server',
    severity: 'high',

    async audit({ runQuick }) {
      const installed = await runQuick('dpkg -l unattended-upgrades 2>/dev/null | grep ^ii | wc -l')
      const active = await runQuick('systemctl is-active unattended-upgrades 2>/dev/null')
      return {
        passed: installed.trim() === '1' && active === 'active',
        actual: installed.trim() === '1' ? `Installiert, Service: ${active}` : 'Nicht installiert',
        expected: 'Installiert + Service aktiv',
      }
    },

    async enforce({ runCmd }) {
      await runCmd('sudo apt-get install -y unattended-upgrades', { timeout: 60000 })
      await runCmd('sudo systemctl enable --now unattended-upgrades')
      return { changed: true }
    },
  },

  {
    id: 'pending-security-updates',
    name: 'Keine ausstehenden Security-Updates',
    category: 'security',
    scope: 'server',
    severity: 'medium',

    async audit({ runCmd }) {
      const output = await runCmd('apt list --upgradable 2>/dev/null | grep -i security | wc -l')
      const count = parseInt(output.trim()) || 0
      return {
        passed: count === 0,
        actual: count === 0 ? 'Keine ausstehenden Security-Updates' : `${count} Security-Updates ausstehend`,
        expected: 'Keine ausstehenden Updates',
      }
    },

    async enforce({ runCmd }) {
      await runCmd('sudo apt-get update && sudo apt-get upgrade -y', { timeout: 300000 })
      return { changed: true }
    },
  },
]
