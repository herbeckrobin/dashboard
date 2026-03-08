// PHP-Haertung

// PHP-ini Pfad dynamisch ermitteln
async function getPhpIniPath(runCmd) {
  // Installierte PHP-Version finden
  const version = (await runCmd('php -r "echo PHP_MAJOR_VERSION.\\".\\".PHP_MINOR_VERSION;" 2>/dev/null')).trim()
  if (!version) return null
  return `/etc/php/${version}/fpm/php.ini`
}

export default [
  {
    id: 'php-expose-off',
    name: 'PHP expose_php deaktiviert',
    category: 'security',
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      const iniPath = await getPhpIniPath(runCmd)
      if (!iniPath) return { passed: true, actual: 'PHP nicht installiert', expected: 'Off' }
      const output = await runCmd(`grep -E "^expose_php" ${iniPath} 2>/dev/null`)
      return {
        passed: output.includes('Off'),
        actual: output.trim() || 'Nicht gesetzt (Default: On)',
        expected: 'expose_php = Off',
      }
    },

    async enforce({ runCmd }) {
      const iniPath = await getPhpIniPath(runCmd)
      if (!iniPath) return { changed: false }
      await runCmd(`sudo sed -i 's/^expose_php.*/expose_php = Off/' ${iniPath}`)
      // PHP-FPM neustarten
      const version = iniPath.match(/php\/(\d+\.\d+)/)?.[1]
      if (version) await runCmd(`sudo systemctl restart php${version}-fpm`)
      return { changed: true }
    },
  },

  {
    id: 'php-display-errors-off',
    name: 'PHP display_errors deaktiviert (Produktion)',
    category: 'security',
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      const iniPath = await getPhpIniPath(runCmd)
      if (!iniPath) return { passed: true, actual: 'PHP nicht installiert', expected: 'Off' }
      const output = await runCmd(`grep -E "^display_errors" ${iniPath} 2>/dev/null`)
      return {
        passed: output.includes('Off'),
        actual: output.trim() || 'Nicht gesetzt',
        expected: 'display_errors = Off',
      }
    },

    async enforce({ runCmd }) {
      const iniPath = await getPhpIniPath(runCmd)
      if (!iniPath) return { changed: false }
      await runCmd(`sudo sed -i 's/^display_errors.*/display_errors = Off/' ${iniPath}`)
      const version = iniPath.match(/php\/(\d+\.\d+)/)?.[1]
      if (version) await runCmd(`sudo systemctl restart php${version}-fpm`)
      return { changed: true }
    },
  },

  {
    id: 'php-allow-url-fopen',
    name: 'PHP allow_url_fopen deaktiviert',
    category: 'security',
    scope: 'server',
    severity: 'medium',

    async audit({ runCmd }) {
      const iniPath = await getPhpIniPath(runCmd)
      if (!iniPath) return { passed: true, actual: 'PHP nicht installiert', expected: 'Off' }
      const output = await runCmd(`grep -E "^allow_url_fopen" ${iniPath} 2>/dev/null`)
      // Hinweis: Manche Frameworks (Composer, WordPress) brauchen allow_url_fopen=On
      // Deshalb nur medium severity
      return {
        passed: output.includes('Off'),
        actual: output.trim() || 'Nicht gesetzt (Default: On)',
        expected: 'allow_url_fopen = Off',
      }
    },

    async enforce({ runCmd }) {
      const iniPath = await getPhpIniPath(runCmd)
      if (!iniPath) return { changed: false }
      await runCmd(`sudo sed -i 's/^allow_url_fopen.*/allow_url_fopen = Off/' ${iniPath}`)
      const version = iniPath.match(/php\/(\d+\.\d+)/)?.[1]
      if (version) await runCmd(`sudo systemctl restart php${version}-fpm`)
      return { changed: true }
    },
  },
]
