// Docker + Docker Compose

export default [
  {
    id: 'docker-installed',
    name: 'Docker installiert und aktiv',
    category: 'bootstrap',
    order: 40,
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      const version = await runCmd('docker --version 2>/dev/null')
      const status = await runCmd('systemctl is-active docker 2>/dev/null')
      const installed = version.includes('Docker')
      const running = status.trim() === 'active'
      return {
        passed: installed && running,
        actual: installed ? (running ? version.trim() : 'installiert, nicht aktiv') : 'Nicht installiert',
        expected: 'Docker installiert und aktiv',
      }
    },

    async enforce({ runCmd }) {
      await runCmd('curl -fsSL https://get.docker.com | sudo bash', { timeout: 180000 })
      await runCmd('sudo systemctl enable docker')
      await runCmd('sudo systemctl start docker')
      // Warten bis Docker Socket bereit ist
      await runCmd('sleep 2 && sudo docker info >/dev/null 2>&1 || sleep 3')
      // deploy User zur docker Gruppe hinzufuegen
      await runCmd('sudo usermod -aG docker deploy 2>/dev/null || true')
      return { changed: true }
    },
  },

  {
    id: 'docker-compose-installed',
    name: 'Docker Compose verfuegbar',
    category: 'bootstrap',
    order: 41,
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      // Plugin-Variante pruefen
      const plugin = await runCmd('docker compose version 2>/dev/null')
      if (plugin.includes('Docker Compose')) {
        return { passed: true, actual: plugin.trim(), expected: 'Docker Compose verfuegbar' }
      }
      // Legacy-Variante
      const legacy = await runCmd('docker-compose --version 2>/dev/null')
      if (legacy.includes('docker-compose')) {
        return { passed: true, actual: legacy.trim(), expected: 'Docker Compose verfuegbar' }
      }
      return { passed: false, actual: 'Nicht installiert', expected: 'Docker Compose verfuegbar' }
    },

    async enforce({ runCmd }) {
      await runCmd('sudo apt-get install -y -qq docker-compose-plugin', { timeout: 60000 })
      return { changed: true }
    },
  },
]
