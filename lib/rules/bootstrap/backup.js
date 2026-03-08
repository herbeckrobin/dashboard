// Backup-System — taegliches Backup aller kritischen Daten

const BACKUP_SCRIPT = `#!/bin/bash
# Automatisches Backup — verwaltet durch Dashboard Rules
set -euo pipefail

BACKUP_DIR="/home/deploy/backups"
DATE=$(date +%Y-%m-%d_%H%M)
TARGET="$BACKUP_DIR/$DATE"
RETENTION_DAYS=7

mkdir -p "$TARGET"

echo "[$(date -Iseconds)] Backup gestartet"

# MariaDB (alle Datenbanken)
if command -v mysqldump &>/dev/null; then
  mysqldump --all-databases --single-transaction --routines --triggers 2>/dev/null | gzip > "$TARGET/mariadb.sql.gz" || true
  echo "  MariaDB: OK"
fi

# Gitea Daten
if [ -d /opt/gitea/data ]; then
  tar -czf "$TARGET/gitea-data.tar.gz" -C /opt/gitea data 2>/dev/null || true
  echo "  Gitea: OK"
fi

# Dashboard Daten
if [ -d /home/deploy/apps/admin-dashboard/data ]; then
  tar -czf "$TARGET/dashboard-data.tar.gz" -C /home/deploy/apps/admin-dashboard data 2>/dev/null || true
  echo "  Dashboard: OK"
fi

# nginx Configs
tar -czf "$TARGET/nginx-configs.tar.gz" -C /etc/nginx sites-available 2>/dev/null || true
echo "  nginx: OK"

# E-Mail Config
if [ -d /etc/postfix/virtual ]; then
  tar -czf "$TARGET/email-config.tar.gz" /etc/postfix/virtual /etc/dovecot/users /var/lib/rspamd/dkim 2>/dev/null || true
  echo "  E-Mail: OK"
fi

# Webhook Server
if [ -d /home/deploy/webhook ]; then
  tar -czf "$TARGET/webhook.tar.gz" -C /home/deploy webhook 2>/dev/null || true
  echo "  Webhook: OK"
fi

# Alte Backups loeschen (Retention)
find "$BACKUP_DIR" -maxdepth 1 -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \\; 2>/dev/null || true

echo "[$(date -Iseconds)] Backup fertig: $TARGET"
`

export default [
  {
    id: 'backup-system-configured',
    name: 'Backup-Script vorhanden und ausfuehrbar',
    category: 'bootstrap',
    order: 80,
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      const exists = (await runCmd('test -f /home/deploy/backups/backup.sh && echo yes || echo no')).trim()
      const executable = (await runCmd('test -x /home/deploy/backups/backup.sh && echo yes || echo no')).trim()
      return {
        passed: exists === 'yes' && executable === 'yes',
        actual: exists === 'yes' ? (executable === 'yes' ? 'Vorhanden und ausfuehrbar' : 'Vorhanden, nicht ausfuehrbar') : 'Fehlt',
        expected: 'backup.sh vorhanden und ausfuehrbar',
      }
    },

    async enforce({ runCmd }) {
      const { writeFileSync } = await import('fs')
      await runCmd('mkdir -p /home/deploy/backups')

      const tmpPath = '/tmp/backup.sh'
      writeFileSync(tmpPath, BACKUP_SCRIPT)
      await runCmd(`mv ${tmpPath} /home/deploy/backups/backup.sh`)
      await runCmd('chmod +x /home/deploy/backups/backup.sh')
      await runCmd('chown -R deploy:deploy /home/deploy/backups')
      return { changed: true }
    },
  },
]
