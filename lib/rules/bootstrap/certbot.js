// Certbot Installation — Let's Encrypt SSL-Zertifikate

export default [
  {
    id: 'certbot-installed',
    name: 'Certbot installiert',
    category: 'bootstrap',
    order: 10,
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      const output = await runCmd('certbot --version 2>&1')
      const installed = output.includes('certbot')
      return {
        passed: installed,
        actual: installed ? output.trim() : 'Nicht installiert',
        expected: 'certbot installiert',
      }
    },

    async enforce({ runCmd }) {
      await runCmd('sudo apt-get update -qq', { timeout: 60000 })
      await runCmd('sudo apt-get install -y -qq certbot python3-certbot-nginx', { timeout: 60000 })
      return { changed: true }
    },
  },
]
