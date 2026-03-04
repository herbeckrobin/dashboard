// Shared Utilities fuer Install-Steps

import crypto from 'crypto'
import { getConfig } from '../config'

export function randomPassword(length = 16) {
  return crypto.randomBytes(length).toString('base64url').substring(0, length)
}

// Cache-Pfade fuer node_modules (tar-Archiv statt Verzeichnis — 50x schneller)
export const WP_MODULES_CACHE = '/home/deploy/cache/wp-scripts-modules.tar.gz'

// Git-Config fuer Commits ohne globale Config
export const GIT_CONF = '-c user.name="Deploy Dashboard" -c user.email="deploy@rhdemo.de"'

export function getGitUrl(repo) {
  const config = getConfig()
  const token = config.giteaToken
  return token
    ? `http://token:${token}@localhost:3000/${repo}.git`
    : `http://localhost:3000/${repo}.git`
}
