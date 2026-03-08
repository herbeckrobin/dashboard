// sudo-Konfiguration — Least Privilege fuer deploy-User

import fs from 'fs'

// Alle sudo-Befehle die das Dashboard benoetigt (gruppiert)
const SUDOERS_CONTENT = `# Dashboard deploy-User — eingeschraenkte sudo-Rechte
# Verwaltet durch Dashboard Rules (nicht manuell aendern)

# Paketmanager
deploy ALL=(ALL) NOPASSWD: /usr/bin/apt-get update, /usr/bin/apt-get update *, /usr/bin/apt-get install *, /usr/bin/apt-get upgrade *

# Systemd Services
deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl start *, /usr/bin/systemctl stop *, /usr/bin/systemctl restart *, /usr/bin/systemctl reload *, /usr/bin/systemctl enable *, /usr/bin/systemctl is-active *

# nginx
deploy ALL=(ALL) NOPASSWD: /usr/sbin/nginx -t, /usr/bin/mv /tmp/nginx-* /etc/nginx/sites-available/*, /usr/bin/ln -sf /etc/nginx/sites-available/* /etc/nginx/sites-enabled/*, /usr/bin/rm -f /etc/nginx/sites-enabled/*, /usr/bin/sed -i * /etc/nginx/*

# SSL/Certbot
deploy ALL=(ALL) NOPASSWD: /usr/bin/certbot *

# Firewall
deploy ALL=(ALL) NOPASSWD: /usr/sbin/ufw *, /usr/sbin/ufw status *

# Fail2ban
deploy ALL=(ALL) NOPASSWD: /usr/bin/fail2ban-client *

# Crontab
deploy ALL=(ALL) NOPASSWD: /usr/bin/crontab *

# Docker
deploy ALL=(ALL) NOPASSWD: /usr/bin/docker *, /usr/bin/docker-compose *, /usr/bin/docker compose *

# SSH Config (nur sed fuer sshd_config)
deploy ALL=(ALL) NOPASSWD: /usr/bin/sed -i * /etc/ssh/sshd_config, /usr/bin/grep * /etc/ssh/sshd_config

# Dateiverwaltung (eingeschraenkt auf Server-Pfade)
deploy ALL=(ALL) NOPASSWD: /usr/bin/chown * /home/deploy/*, /usr/bin/chmod * /home/deploy/*, /usr/bin/chown * /var/*, /usr/bin/chmod * /var/*, /usr/bin/mkdir -p /opt/*, /usr/bin/mv /tmp/* /opt/*, /usr/bin/mv /tmp/* /etc/*, /usr/bin/mv /tmp/* /usr/share/keyrings/*

# Mail (Postfix/Dovecot)
deploy ALL=(ALL) NOPASSWD: /usr/sbin/postconf *, /usr/sbin/postmap *, /usr/bin/touch /etc/postfix/*, /usr/bin/touch /etc/dovecot/*, /usr/sbin/htpasswd *

# MariaDB
deploy ALL=(ALL) NOPASSWD: /usr/bin/mysql, /usr/bin/mysql *, /usr/bin/mariadb, /usr/bin/mariadb *

# User-Management (fuer vmail)
deploy ALL=(ALL) NOPASSWD: /usr/sbin/groupadd *, /usr/sbin/useradd *

# debconf
deploy ALL=(ALL) NOPASSWD: /usr/bin/debconf-set-selections

# Sudoers (fuer audit)
deploy ALL=(ALL) NOPASSWD: /usr/bin/grep * /etc/sudoers*, /usr/sbin/visudo -c *

# Find (fuer Permissions)
deploy ALL=(ALL) NOPASSWD: /usr/bin/find /home/deploy/*
`

export default [
  {
    id: 'sudo-no-nopasswd-all',
    name: 'deploy-User hat kein NOPASSWD:ALL',
    category: 'security',
    scope: 'server',
    severity: 'critical',

    async audit({ runCmd }) {
      // Alle sudoers-Dateien nach deploy ALL=(ALL) NOPASSWD: ALL durchsuchen
      const output = await runCmd('sudo grep -r "deploy.*NOPASSWD.*ALL" /etc/sudoers /etc/sudoers.d/ 2>/dev/null')
      const hasFullAccess = output.includes('NOPASSWD: ALL') || output.includes('NOPASSWD:ALL')
      return {
        passed: !hasFullAccess,
        actual: hasFullAccess ? 'deploy hat NOPASSWD: ALL' : 'Kein NOPASSWD: ALL',
        expected: 'Eingeschraenkte sudo-Rechte (Least Privilege)',
      }
    },

    async enforce({ runCmd }) {
      // 1. Neue granulare sudoers-Datei schreiben
      const tmpPath = '/tmp/deploy-dashboard-sudoers'
      fs.writeFileSync(tmpPath, SUDOERS_CONTENT)

      // 2. Syntax pruefen (verhindert Lockout bei Fehler)
      const check = await runCmd(`sudo visudo -c -f ${tmpPath} 2>&1`)
      if (!check.includes('parsed OK')) {
        fs.unlinkSync(tmpPath)
        throw new Error(`sudoers Syntax-Fehler: ${check}`)
      }

      // 3. Alte NOPASSWD:ALL Dateien ersetzen
      await runCmd(`sudo mv ${tmpPath} /etc/sudoers.d/deploy-dashboard`)
      await runCmd('sudo chown root:root /etc/sudoers.d/deploy-dashboard')
      await runCmd('sudo chmod 440 /etc/sudoers.d/deploy-dashboard')

      // 4. deploy-full entfernen (Duplikat)
      await runCmd('sudo rm -f /etc/sudoers.d/deploy-full')

      return { changed: true }
    },
  },
]
