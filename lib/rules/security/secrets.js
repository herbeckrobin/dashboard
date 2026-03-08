// Secrets Management — alles audit-only

export default [
  {
    id: 'webhook-secret-env',
    name: 'Webhook-Secret aus ENV (nicht hardcoded)',
    category: 'security',
    scope: 'server',
    severity: 'critical',

    async audit({ runCmd }) {
      // Pruefen ob webhook-server.js process.env.WEBHOOK_SECRET nutzt
      const code = await runCmd('grep -c "process.env.WEBHOOK_SECRET" /home/deploy/webhook/webhook-server.js 2>/dev/null')
      const count = parseInt(code.trim()) || 0
      // Pruefen ob kein hardcoded Secret drin ist
      const hardcoded = await runCmd('grep -cE "[a-f0-9]{32,}" /home/deploy/webhook/webhook-server.js 2>/dev/null | head -1')
      const hasHardcoded = parseInt(hardcoded.trim()) > 0
      return {
        passed: count > 0 && !hasHardcoded,
        actual: count > 0 ? (hasHardcoded ? 'ENV genutzt, aber auch Hardcoded-Werte gefunden' : 'Aus ENV geladen') : 'Nicht aus ENV geladen',
        expected: 'WEBHOOK_SECRET aus process.env',
      }
    },
    enforce: null,
  },

  {
    id: 'env-files-not-in-git',
    name: '.env Dateien nicht in Git',
    category: 'security',
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      // .gitignore in Projekten pruefen
      const output = await runCmd('find /home/deploy/apps -name ".env" -exec sh -c \'cd "$(dirname "{}")" && git ls-files --error-unmatch .env 2>/dev/null && echo "TRACKED: $(dirname "{}")" || true\' \\; 2>/dev/null')
      const tracked = output.split('\n').filter(l => l.startsWith('TRACKED:'))
      return {
        passed: tracked.length === 0,
        actual: tracked.length === 0 ? 'Keine .env in Git' : `In Git: ${tracked.join(', ')}`,
        expected: 'Keine .env Dateien in Git-Repos',
      }
    },
    enforce: null,
  },

  {
    id: 'jwt-secret-strength',
    name: 'JWT-Secret ausreichend stark',
    category: 'security',
    scope: 'server',
    severity: 'critical',

    async audit({ runCmd }) {
      // auth.json pruefen ob jwtSecret gesetzt und lang genug ist
      const output = await runCmd('node -e "const d=require(\'/home/deploy/apps/admin-dashboard/data/auth.json\');console.log(d.jwtSecret?.length||0)" 2>/dev/null')
      const length = parseInt(output.trim()) || 0
      return {
        passed: length >= 32,
        actual: length > 0 ? `${length} Zeichen` : 'Nicht gesetzt',
        expected: '≥ 32 Zeichen',
      }
    },

    async enforce({ runCmd }) {
      // JWT-Secret generieren und in auth.json setzen
      await runCmd(`node -e "
        const fs = require('fs');
        const path = '/home/deploy/apps/admin-dashboard/data/auth.json';
        const d = JSON.parse(fs.readFileSync(path, 'utf8'));
        if (!d.jwtSecret || d.jwtSecret.length < 32) {
          d.jwtSecret = require('crypto').randomBytes(32).toString('hex');
          fs.writeFileSync(path, JSON.stringify(d, null, 2));
          console.log('JWT-Secret generiert');
        }
      "`)
      return { changed: true }
    },
  },

  {
    id: 'gitea-token-not-exposed',
    name: 'Gitea-Token nicht in Logs',
    category: 'security',
    scope: 'server',
    severity: 'high',

    async audit({ runCmd, getConfig }) {
      const config = getConfig()
      const token = config.giteaToken
      if (!token) return { passed: true, actual: 'Kein Token konfiguriert', expected: 'Token nicht in Logs' }
      // In nginx access logs nach Token suchen
      const found = await runCmd(`grep -c "${token.substring(0, 10)}" /var/log/nginx/access.log 2>/dev/null || echo 0`)
      const count = parseInt(found.trim()) || 0
      return {
        passed: count === 0,
        actual: count === 0 ? 'Token nicht in Logs gefunden' : `${count} Treffer in nginx Logs`,
        expected: 'Token nicht in Logs',
      }
    },
    enforce: null,
  },
]
