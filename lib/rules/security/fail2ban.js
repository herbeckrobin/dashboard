// Fail2ban Brute-Force-Schutz

import fs from 'fs'

const JAIL_LOCAL_TEMPLATE = `[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
logpath = /var/log/auth.log

[dovecot]
enabled = true
port = pop3,pop3s,imap,imaps
logpath = /var/log/mail.log

[postfix]
enabled = true
port = smtp,465,submission
logpath = /var/log/mail.log
`

// jail.local schreiben oder aktualisieren
async function ensureJailLocal(runCmd) {
  const exists = (await runCmd('test -f /etc/fail2ban/jail.local && echo yes || echo no')).trim()
  if (exists !== 'yes') {
    const tmpPath = '/tmp/fail2ban-jail.local'
    fs.writeFileSync(tmpPath, JAIL_LOCAL_TEMPLATE)
    await runCmd(`sudo mv ${tmpPath} /etc/fail2ban/jail.local`)
  }
}

export default [
  {
    id: 'f2b-running',
    name: 'Fail2ban Service laeuft',
    category: 'security',
    scope: 'server',
    severity: 'critical',

    async audit({ runQuick }) {
      const status = await runQuick('systemctl is-active fail2ban')
      return {
        passed: status === 'active',
        actual: status || 'nicht installiert',
        expected: 'active',
      }
    },

    async enforce({ runCmd }) {
      // Installieren falls noetig
      await runCmd('sudo apt-get install -y -qq fail2ban 2>/dev/null || true', { timeout: 30000 })
      await runCmd('sudo systemctl enable fail2ban')
      await runCmd('sudo systemctl start fail2ban')
      // Warten bis fail2ban Socket bereit ist
      await runCmd('sleep 3 && sudo fail2ban-client ping 2>/dev/null || sleep 2')
      return { changed: true }
    },
  },

  {
    id: 'f2b-ssh-jail',
    name: 'SSH-Jail aktiv',
    category: 'security',
    scope: 'server',
    severity: 'critical',

    async audit({ runCmd }) {
      const output = await runCmd('sudo fail2ban-client status sshd 2>/dev/null')
      const active = output.includes('Status for the jail: sshd')
      return {
        passed: active,
        actual: active ? 'sshd Jail aktiv' : 'sshd Jail nicht gefunden',
        expected: 'sshd Jail aktiv',
      }
    },

    async enforce({ runCmd }) {
      await ensureJailLocal(runCmd)
      await runCmd('sudo systemctl restart fail2ban')
      // Warten bis fail2ban Socket bereit (braucht 2-5s nach Restart)
      await runCmd('sleep 3 && sudo fail2ban-client ping 2>/dev/null || sleep 2')
      return { changed: true }
    },
  },

  {
    id: 'f2b-max-retry',
    name: 'Fail2ban maxretry ≤ 5',
    category: 'security',
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      // jail.local oder jail.d/ pruefen
      const output = await runCmd('grep -E "^maxretry" /etc/fail2ban/jail.local 2>/dev/null || grep -rE "^maxretry" /etc/fail2ban/jail.d/ 2>/dev/null')
      const match = output.match(/maxretry\s*=\s*(\d+)/)
      const retries = match ? parseInt(match[1]) : 5 // Default: 5
      return {
        passed: retries <= 5,
        actual: `maxretry = ${retries}`,
        expected: 'maxretry ≤ 5',
      }
    },

    async enforce({ runCmd }) {
      await ensureJailLocal(runCmd)
      // Wert in jail.local setzen
      await runCmd("sudo sed -i 's/^maxretry.*/maxretry = 5/' /etc/fail2ban/jail.local")
      await runCmd('sudo systemctl restart fail2ban')
      return { changed: true }
    },
  },

  {
    id: 'f2b-ban-time',
    name: 'Fail2ban bantime ≥ 1h',
    category: 'security',
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      const output = await runCmd('grep -E "^bantime" /etc/fail2ban/jail.local 2>/dev/null || grep -rE "^bantime" /etc/fail2ban/jail.d/ 2>/dev/null')
      const match = output.match(/bantime\s*=\s*(\d+)/)
      const bantime = match ? parseInt(match[1]) : 600 // Default: 600s
      return {
        passed: bantime >= 3600,
        actual: `bantime = ${bantime}s (${Math.round(bantime / 60)} min)`,
        expected: 'bantime ≥ 3600s (1h)',
      }
    },

    async enforce({ runCmd }) {
      await ensureJailLocal(runCmd)
      // Wert in jail.local setzen
      await runCmd("sudo sed -i 's/^bantime.*/bantime = 3600/' /etc/fail2ban/jail.local")
      await runCmd('sudo systemctl restart fail2ban')
      return { changed: true }
    },
  },

  {
    id: 'f2b-dovecot-jail',
    name: 'Dovecot IMAP Fail2ban-Jail aktiv',
    category: 'security',
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      // Pruefen ob Dovecot ueberhaupt installiert ist
      const dovecotInstalled = (await runCmd('dpkg -l dovecot-imapd 2>/dev/null | grep -c "^ii"')).trim()
      if (dovecotInstalled !== '1') return { passed: true, actual: 'Dovecot nicht installiert', expected: 'Jail aktiv (wenn Dovecot installiert)' }
      // Jail in jail.local pruefen
      const jailConfig = await runCmd('cat /etc/fail2ban/jail.local 2>/dev/null')
      const hasDovecot = jailConfig.includes('[dovecot]') && jailConfig.includes('enabled = true')
      return {
        passed: hasDovecot,
        actual: hasDovecot ? 'dovecot Jail konfiguriert' : 'dovecot Jail fehlt',
        expected: 'dovecot Jail aktiv',
      }
    },

    async enforce({ runCmd }) {
      await ensureJailLocal(runCmd)
      // Pruefen ob dovecot Block existiert, sonst hinzufuegen
      const jailConfig = await runCmd('cat /etc/fail2ban/jail.local 2>/dev/null')
      if (!jailConfig.includes('[dovecot]')) {
        await runCmd("echo '\n[dovecot]\nenabled = true\nport = pop3,pop3s,imap,imaps\nlogpath = /var/log/mail.log\n' | sudo tee -a /etc/fail2ban/jail.local > /dev/null")
      }
      await runCmd('sudo systemctl restart fail2ban')
      await runCmd('sleep 3 && sudo fail2ban-client ping 2>/dev/null || sleep 2')
      return { changed: true }
    },
  },

  {
    id: 'f2b-postfix-jail',
    name: 'Postfix SMTP Fail2ban-Jail aktiv',
    category: 'security',
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      // Pruefen ob Postfix ueberhaupt installiert ist
      const postfixInstalled = (await runCmd('dpkg -l postfix 2>/dev/null | grep -c "^ii"')).trim()
      if (postfixInstalled !== '1') return { passed: true, actual: 'Postfix nicht installiert', expected: 'Jail aktiv (wenn Postfix installiert)' }
      const jailConfig = await runCmd('cat /etc/fail2ban/jail.local 2>/dev/null')
      const hasPostfix = jailConfig.includes('[postfix]') && jailConfig.includes('enabled = true')
      return {
        passed: hasPostfix,
        actual: hasPostfix ? 'postfix Jail konfiguriert' : 'postfix Jail fehlt',
        expected: 'postfix Jail aktiv',
      }
    },

    async enforce({ runCmd }) {
      await ensureJailLocal(runCmd)
      const jailConfig = await runCmd('cat /etc/fail2ban/jail.local 2>/dev/null')
      if (!jailConfig.includes('[postfix]')) {
        await runCmd("echo '\n[postfix]\nenabled = true\nport = smtp,465,submission\nlogpath = /var/log/mail.log\n' | sudo tee -a /etc/fail2ban/jail.local > /dev/null")
      }
      await runCmd('sudo systemctl restart fail2ban')
      await runCmd('sleep 3 && sudo fail2ban-client ping 2>/dev/null || sleep 2')
      return { changed: true }
    },
  },
]
