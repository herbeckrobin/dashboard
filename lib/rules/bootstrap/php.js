// PHP 8.2/8.3, Composer, WP-CLI

const PHP_EXTENSIONS = 'cli fpm mysql gd curl xml mbstring zip intl bcmath soap'

export default [
  {
    id: 'php-installed',
    name: 'PHP 8.2 + 8.3 mit Extensions installiert',
    category: 'bootstrap',
    order: 20,
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      const php82 = await runCmd('php8.2 -v 2>/dev/null')
      const php83 = await runCmd('php8.3 -v 2>/dev/null')
      const has82 = php82.includes('PHP 8.2')
      const has83 = php83.includes('PHP 8.3')
      // FPM-Services pruefen
      const fpm82 = (await runCmd('systemctl is-active php8.2-fpm 2>/dev/null')).trim()
      const fpm83 = (await runCmd('systemctl is-active php8.3-fpm 2>/dev/null')).trim()

      const parts = []
      if (has82) parts.push(`8.2 (FPM: ${fpm82})`)
      if (has83) parts.push(`8.3 (FPM: ${fpm83})`)

      return {
        passed: has82 && has83 && fpm82 === 'active' && fpm83 === 'active',
        actual: parts.length ? parts.join(', ') : 'Nicht installiert',
        expected: 'PHP 8.2 + 8.3 mit FPM aktiv',
      }
    },

    async enforce({ runCmd }) {
      // OS erkennen fuer Sury-Repo
      const osRelease = await runCmd('cat /etc/os-release')
      const isUbuntu = osRelease.includes('ID=ubuntu')
      const versionMatch = osRelease.match(/VERSION_ID="?(\d+)/)
      const majorVersion = versionMatch ? parseInt(versionMatch[1]) : 0

      // Sury-Repo fuer PHP-Versionen (Ubuntu 24 hat nur 8.3, braucht sury fuer 8.2)
      // Temp files + sudo mv (gpg/tee sind nicht in sudoers)
      const repoExists = (await runCmd('test -f /etc/apt/sources.list.d/sury-php.list && echo yes || test -d /etc/apt/sources.list.d/ondrej-* && echo yes || echo no')).trim()
      if (repoExists !== 'yes') {
        await runCmd('sudo apt-get install -y -qq gnupg2 ca-certificates lsb-release', { timeout: 30000 })
        const codename = (await runCmd('lsb_release -cs 2>/dev/null')).trim()
        if (isUbuntu) {
          await runCmd('curl -fsSL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x14aa40ec0831756756d7f66c4f4ea0aae5267a6c" -o /tmp/ondrej-php.gpg.asc 2>/dev/null')
          await runCmd('gpg --dearmor -o /tmp/ondrej-php.gpg /tmp/ondrej-php.gpg.asc 2>/dev/null || true')
          await runCmd('sudo mv /tmp/ondrej-php.gpg /usr/share/keyrings/ondrej-php.gpg')
          const { writeFileSync } = await import('fs')
          writeFileSync('/tmp/sury-php.list', `deb [signed-by=/usr/share/keyrings/ondrej-php.gpg] https://ppa.launchpadcontent.net/ondrej/php/ubuntu ${codename} main\n`)
          await runCmd('sudo mv /tmp/sury-php.list /etc/apt/sources.list.d/sury-php.list')
        } else {
          await runCmd('curl -fsSL https://packages.sury.org/php/apt.gpg -o /tmp/sury-php.gpg.asc 2>/dev/null')
          await runCmd('gpg --dearmor -o /tmp/sury-php.gpg /tmp/sury-php.gpg.asc 2>/dev/null || true')
          await runCmd('sudo mv /tmp/sury-php.gpg /usr/share/keyrings/sury-php.gpg')
          const { writeFileSync } = await import('fs')
          writeFileSync('/tmp/sury-php.list', `deb [signed-by=/usr/share/keyrings/sury-php.gpg] https://packages.sury.org/php/ ${codename} main\n`)
          await runCmd('sudo mv /tmp/sury-php.list /etc/apt/sources.list.d/sury-php.list')
        }
        await runCmd('rm -f /tmp/ondrej-php.gpg.asc /tmp/sury-php.gpg.asc')
        await runCmd('sudo apt-get update -qq', { timeout: 60000 })
      }

      // PHP 8.2 + 8.3 mit Extensions installieren
      const exts = PHP_EXTENSIONS.split(' ')
      for (const version of ['8.2', '8.3']) {
        const packages = exts.map(ext => `php${version}-${ext}`).join(' ')
        await runCmd(`sudo apt-get install -y -qq ${packages}`, { timeout: 120000 })
        await runCmd(`sudo systemctl enable php${version}-fpm`)
        await runCmd(`sudo systemctl start php${version}-fpm`)
      }
      return { changed: true }
    },
  },

  {
    id: 'composer-installed',
    name: 'Composer installiert',
    category: 'bootstrap',
    order: 21,
    scope: 'server',
    severity: 'medium',

    async audit({ runCmd }) {
      const output = await runCmd('composer --version 2>/dev/null || /usr/local/bin/composer --version 2>/dev/null')
      const installed = output.includes('Composer')
      return {
        passed: installed,
        actual: installed ? output.trim().split('\n')[0] : 'Nicht installiert',
        expected: 'Composer installiert',
      }
    },

    async enforce({ runCmd }) {
      await runCmd('curl -fsSL https://getcomposer.org/installer | sudo php -- --install-dir=/usr/local/bin --filename=composer', { timeout: 60000 })
      return { changed: true }
    },
  },

  {
    id: 'wpcli-installed',
    name: 'WP-CLI installiert',
    category: 'bootstrap',
    order: 22,
    scope: 'server',
    severity: 'medium',

    async audit({ runCmd }) {
      const output = await runCmd('wp --info --allow-root 2>/dev/null || /usr/local/bin/wp --info --allow-root 2>/dev/null')
      const installed = output.includes('WP-CLI')
      return {
        passed: installed,
        actual: installed ? 'Installiert' : 'Nicht installiert',
        expected: 'WP-CLI installiert',
      }
    },

    async enforce({ runCmd }) {
      await runCmd('sudo curl -fsSL https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar -o /usr/local/bin/wp', { timeout: 30000 })
      await runCmd('sudo chmod +x /usr/local/bin/wp')
      return { changed: true }
    },
  },
]
