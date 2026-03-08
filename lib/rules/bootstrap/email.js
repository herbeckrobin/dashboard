// E-Mail Stack — Postfix, Dovecot, rspamd, Redis

const DOVECOT_CUSTOM_CONF = `# Dovecot Custom Config — verwaltet durch Dashboard Rules
mail_location = maildir:/var/vmail/%d/%n/Maildir
mail_uid = 5000
mail_gid = 5000
first_valid_uid = 5000

protocols = imap lmtp sieve

service lmtp {
  unix_listener /var/spool/postfix/private/dovecot-lmtp {
    mode = 0600
    user = postfix
    group = postfix
  }
}

service auth {
  unix_listener /var/spool/postfix/private/auth {
    mode = 0660
    user = postfix
    group = postfix
  }
}

service managesieve-login {
  inet_listener sieve {
    port = 4190
  }
}

protocol lmtp {
  mail_plugins = sieve
}

ssl = required
ssl_cert = </etc/ssl/certs/ssl-cert-snakeoil.pem
ssl_key = </etc/ssl/private/ssl-cert-snakeoil.key
`

const DOVECOT_AUTH_CONF = `# Auth via passwd-file
disable_plaintext_auth = yes
auth_mechanisms = plain login

passdb {
  driver = passwd-file
  args = scheme=BLF-CRYPT /etc/dovecot/users/passwd
}

userdb {
  driver = static
  args = uid=5000 gid=5000 home=/var/vmail/%d/%n
}
`

const POSTFIX_SUBMISSION_BLOCK = `
# Submission Port (587) — Dashboard Rules
submission     inet  n       -       y       -       -       smtpd
  -o syslog_name=postfix/submission
  -o smtpd_tls_security_level=encrypt
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_sasl_type=dovecot
  -o smtpd_sasl_path=private/auth
  -o smtpd_recipient_restrictions=permit_sasl_authenticated,reject
`

export default [
  {
    id: 'email-packages',
    name: 'E-Mail Pakete installiert (Postfix, Dovecot, rspamd)',
    category: 'bootstrap',
    order: 60,
    scope: 'server',
    severity: 'high',

    async audit({ runQuick }) {
      const services = ['postfix', 'dovecot', 'rspamd', 'redis-server']
      const results = {}
      for (const svc of services) {
        results[svc] = (await runQuick(`systemctl is-active ${svc}`)).trim()
      }
      const allActive = Object.values(results).every(s => s === 'active')
      const status = Object.entries(results).map(([k, v]) => `${k}: ${v}`).join(', ')
      return {
        passed: allActive,
        actual: status,
        expected: 'Alle E-Mail Services aktiv',
      }
    },

    async enforce({ runCmd }) {
      // Postfix non-interactive vorkonfigurieren
      await runCmd("echo 'postfix postfix/main_mailer_type select Internet Site' | sudo debconf-set-selections")
      await runCmd("echo 'postfix postfix/mailname string localhost' | sudo debconf-set-selections")

      // Pakete installieren
      const packages = [
        'postfix', 'postfix-policyd-spf-python',
        'dovecot-imapd', 'dovecot-lmtpd', 'dovecot-sieve', 'dovecot-managesieved',
        'rspamd', 'redis-server',
      ].join(' ')
      await runCmd(`sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ${packages}`, { timeout: 120000 })

      // vmail User erstellen
      await runCmd('sudo groupadd -g 5000 vmail 2>/dev/null || true')
      await runCmd('sudo useradd -g vmail -u 5000 -d /var/vmail -m -s /usr/sbin/nologin vmail 2>/dev/null || true')
      await runCmd('sudo mkdir -p /var/vmail && sudo chown vmail:vmail /var/vmail')

      // Postfix Virtual-Verzeichnisse
      await runCmd('sudo mkdir -p /etc/postfix/virtual')
      await runCmd('sudo touch /etc/postfix/virtual/domains /etc/postfix/virtual/mailboxes /etc/postfix/virtual/aliases')

      // Services starten
      for (const svc of ['postfix', 'dovecot', 'rspamd', 'redis-server']) {
        await runCmd(`sudo systemctl enable ${svc}`)
        await runCmd(`sudo systemctl start ${svc}`)
      }
      return { changed: true }
    },
  },

  {
    id: 'email-postfix-config',
    name: 'Postfix korrekt konfiguriert',
    category: 'bootstrap',
    order: 61,
    scope: 'server',
    severity: 'high',

    async audit({ runCmd, getConfig }) {
      const config = getConfig()
      const hostname = config.mailDomain || ''
      if (!hostname) return { passed: false, actual: 'mailDomain nicht konfiguriert', expected: 'Postfix konfiguriert' }

      const myhostname = (await runCmd('postconf -h myhostname 2>/dev/null')).trim()
      const transport = (await runCmd('postconf -h virtual_transport 2>/dev/null')).trim()
      const masterCf = await runCmd('grep -c "^submission" /etc/postfix/master.cf 2>/dev/null')

      const issues = []
      if (myhostname !== hostname) issues.push(`myhostname: ${myhostname}`)
      if (!transport.includes('lmtp')) issues.push(`transport: ${transport}`)
      if (!masterCf.trim() || masterCf.trim() === '0') issues.push('submission Port fehlt')

      return {
        passed: issues.length === 0,
        actual: issues.length ? issues.join(', ') : 'Korrekt konfiguriert',
        expected: 'Postfix mit LMTP + Submission',
      }
    },

    async enforce({ runCmd, getConfig, escapeShellArg }) {
      const config = getConfig()
      const hostname = config.mailDomain
      const domain = config.serverDomain
      if (!hostname) throw new Error('mailDomain nicht in config.json gesetzt')

      // Postfix Hauptkonfiguration
      const postconfCmds = [
        `myhostname = ${hostname}`,
        `mydomain = ${domain}`,
        'myorigin = $mydomain',
        'mydestination = $myhostname, localhost.$mydomain, localhost',
        'inet_interfaces = all',
        'inet_protocols = ipv4',
        'virtual_mailbox_domains = hash:/etc/postfix/virtual/domains',
        'virtual_mailbox_maps = hash:/etc/postfix/virtual/mailboxes',
        'virtual_alias_maps = hash:/etc/postfix/virtual/aliases',
        'virtual_transport = lmtp:unix:private/dovecot-lmtp',
        'smtpd_sasl_type = dovecot',
        'smtpd_sasl_path = private/auth',
        'smtpd_sasl_auth_enable = yes',
        'smtpd_tls_security_level = may',
        'smtpd_milters = inet:localhost:11332',
        'non_smtpd_milters = inet:localhost:11332',
        'milter_protocol = 6',
        'milter_default_action = accept',
      ]

      for (const line of postconfCmds) {
        await runCmd(`sudo postconf -e ${escapeShellArg(line)}`)
      }

      // Virtual Maps initialisieren (postmap)
      await runCmd('sudo postmap /etc/postfix/virtual/domains 2>/dev/null || true')
      await runCmd('sudo postmap /etc/postfix/virtual/mailboxes 2>/dev/null || true')
      await runCmd('sudo postmap /etc/postfix/virtual/aliases 2>/dev/null || true')

      // Submission Port in master.cf
      const hasSubmission = await runCmd('grep -c "^submission" /etc/postfix/master.cf 2>/dev/null')
      if (!hasSubmission.trim() || hasSubmission.trim() === '0') {
        const { writeFileSync } = await import('fs')
        const tmpPath = '/tmp/postfix-submission.cf'
        const masterCf = await runCmd('cat /etc/postfix/master.cf')
        writeFileSync(tmpPath, masterCf + POSTFIX_SUBMISSION_BLOCK)
        await runCmd(`sudo mv ${tmpPath} /etc/postfix/master.cf`)
      }

      await runCmd('sudo systemctl restart postfix')
      return { changed: true }
    },
  },

  {
    id: 'email-dovecot-config',
    name: 'Dovecot korrekt konfiguriert',
    category: 'bootstrap',
    order: 62,
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      const customConf = (await runCmd('test -f /etc/dovecot/conf.d/10-custom.conf && echo yes || echo no')).trim()
      const authConf = (await runCmd('test -f /etc/dovecot/conf.d/10-auth.conf && echo yes || echo no')).trim()
      const passwdDir = (await runCmd('test -d /etc/dovecot/users && echo yes || echo no')).trim()

      const issues = []
      if (customConf !== 'yes') issues.push('10-custom.conf fehlt')
      if (authConf !== 'yes') issues.push('10-auth.conf fehlt')
      if (passwdDir !== 'yes') issues.push('users/ Verzeichnis fehlt')

      return {
        passed: issues.length === 0,
        actual: issues.length ? issues.join(', ') : 'Konfiguriert',
        expected: 'Dovecot Config-Dateien vorhanden',
      }
    },

    async enforce({ runCmd }) {
      const { writeFileSync } = await import('fs')

      // 10-custom.conf
      const tmpCustom = '/tmp/dovecot-10-custom.conf'
      writeFileSync(tmpCustom, DOVECOT_CUSTOM_CONF)
      await runCmd(`sudo mv ${tmpCustom} /etc/dovecot/conf.d/10-custom.conf`)

      // 10-auth.conf
      const tmpAuth = '/tmp/dovecot-10-auth.conf'
      writeFileSync(tmpAuth, DOVECOT_AUTH_CONF)
      await runCmd(`sudo mv ${tmpAuth} /etc/dovecot/conf.d/10-auth.conf`)

      // Passwd-Verzeichnis
      await runCmd('sudo mkdir -p /etc/dovecot/users')
      await runCmd('sudo touch /etc/dovecot/users/passwd')
      await runCmd('sudo chown root:dovecot /etc/dovecot/users/passwd')
      await runCmd('sudo chmod 640 /etc/dovecot/users/passwd')

      // rspamd DKIM-Verzeichnis
      await runCmd('sudo mkdir -p /var/lib/rspamd/dkim')
      await runCmd('sudo chown _rspamd:_rspamd /var/lib/rspamd/dkim 2>/dev/null || true')

      await runCmd('sudo systemctl restart dovecot')
      return { changed: true }
    },
  },
]
