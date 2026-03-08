// Shared Utilities fuer Install-Steps

import crypto from 'crypto'
import { getConfig } from '../config'

export function randomPassword(length = 16) {
  return crypto.randomBytes(length).toString('base64url').substring(0, length)
}

// Cache-Pfade fuer node_modules (tar-Archiv statt Verzeichnis — 50x schneller)
export const WP_MODULES_CACHE = '/home/deploy/cache/wp-scripts-modules.tar.gz'

// Git-Config fuer Commits ohne globale Config
export function getGitConf() {
  const config = getConfig()
  const domain = config.serverDomain || 'localhost'
  return `-c user.name="Deploy Dashboard" -c user.email="deploy@${domain}"`
}

export function getGitUrl(repo) {
  return `http://localhost:3000/${repo}.git`
}

// Git-Credential-Helper: Token sicher uebergeben ohne URL-Einbettung (verhindert Token-Leakage in Logs)
export function getGitCredentialHelper() {
  const config = getConfig()
  const token = config.giteaToken
  if (!token) return ''
  return `-c credential.helper='!f() { echo "username=token"; echo "password=${token.replace(/'/g, "'\\''")}"; }; f'`
}
