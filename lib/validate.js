// Eingabe-Validierung und Shell-Escaping Utilities

// Projekt-Name: Buchstaben, Zahlen, Punkte, Bindestriche, Unterstriche
const PROJECT_NAME_RE = /^[a-z0-9][a-z0-9._-]*$/i
const MAX_PROJECT_NAME = 64

// Domain: Valides FQDN
const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i
const MAX_DOMAIN = 253

// Erlaubte preBuildCmd Prefixe
const ALLOWED_CMD_PREFIXES = [
  'prisma',
  'bun run',
  'bunx',
  'npm run',
  'node ',
  'php artisan',
  'composer',
]

// Gefaehrliche Shell-Zeichen in Commands
const DANGEROUS_SHELL_CHARS = /[;&|`$(){}!<>\\#\n\r]/

export function validateProjectName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Projektname ist erforderlich' }
  }
  if (name.length > MAX_PROJECT_NAME) {
    return { valid: false, error: `Projektname darf maximal ${MAX_PROJECT_NAME} Zeichen lang sein` }
  }
  if (!PROJECT_NAME_RE.test(name)) {
    return { valid: false, error: 'Projektname darf nur Buchstaben, Zahlen, Punkte, Bindestriche und Unterstriche enthalten und muss mit Buchstabe/Zahl beginnen' }
  }
  // Path-Traversal verhindern
  if (name.includes('..') || name.includes('/')) {
    return { valid: false, error: 'Ungueltiger Projektname' }
  }
  return { valid: true }
}

export function validateDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    return { valid: false, error: 'Domain ist erforderlich' }
  }
  if (domain.length > MAX_DOMAIN) {
    return { valid: false, error: `Domain darf maximal ${MAX_DOMAIN} Zeichen lang sein` }
  }
  if (!DOMAIN_RE.test(domain)) {
    return { valid: false, error: 'Ungueltige Domain (z.B. example.de)' }
  }
  return { valid: true }
}

export function validatePreBuildCmd(cmd) {
  if (!cmd || typeof cmd !== 'string') {
    return { valid: true } // Leerer Befehl ist ok
  }
  const trimmed = cmd.trim()
  if (!trimmed) return { valid: true }

  // Gefaehrliche Shell-Zeichen pruefen
  if (DANGEROUS_SHELL_CHARS.test(trimmed)) {
    return { valid: false, error: 'Pre-Build Befehl enthaelt ungueltige Zeichen (keine Shell-Operatoren erlaubt)' }
  }

  // Whitelist-Check
  const allowed = ALLOWED_CMD_PREFIXES.some(prefix => trimmed.startsWith(prefix))
  if (!allowed) {
    return { valid: false, error: `Pre-Build Befehl muss mit einem erlaubten Prefix beginnen: ${ALLOWED_CMD_PREFIXES.join(', ')}` }
  }

  // node darf nur mit relativen Pfaden aufgerufen werden (kein -e, -p, --eval etc.)
  if (trimmed.startsWith('node ')) {
    const arg = trimmed.slice(5).trim()
    if (arg.startsWith('-') || arg.startsWith('/')) {
      return { valid: false, error: 'node darf nur mit relativen Pfaden verwendet werden (kein -e, --eval etc.)' }
    }
  }

  return { valid: true }
}

// Git-SubPath: nur alphanumerische Zeichen, Bindestriche, Unterstriche, Schraegstriche, Punkte
const GIT_SUB_PATH_RE = /^[a-z0-9/_.-]+$/i

export function validateGitSubPath(subPath) {
  if (!subPath || typeof subPath !== 'string') return { valid: true }
  const trimmed = subPath.trim()
  if (!trimmed) return { valid: true }
  if (!GIT_SUB_PATH_RE.test(trimmed)) {
    return { valid: false, error: 'gitSubPath enthaelt ungueltige Zeichen' }
  }
  if (trimmed.includes('..')) {
    return { valid: false, error: 'gitSubPath darf kein ".." enthalten' }
  }
  return { valid: true }
}

// POSIX Shell-Argument Escaping: Umschliesst mit Single-Quotes
export function escapeShellArg(arg) {
  if (arg === undefined || arg === null) return "''"
  const str = String(arg)
  if (str === '') return "''"
  // Single-Quotes im String escapen: ' → '\''
  return "'" + str.replace(/'/g, "'\\''") + "'"
}

// SQL-Value Escaping fuer mysql CLI
export function escapeSqlValue(val) {
  if (val === undefined || val === null) return "''"
  const str = String(val)
  const escaped = str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/`/g, '\\`')
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
  return "'" + escaped + "'"
}

// SQL-Identifier sanitizen (nur alphanumerische + Unterstriche)
export function sanitizeSqlIdentifier(name) {
  return String(name).replace(/[^a-z0-9_]/gi, '')
}
