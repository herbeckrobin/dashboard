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

// CSP-Whitelist: Domain-Eintraege fuer Content-Security-Policy
const CSP_DOMAIN_RE = /^(\*\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i
const MAX_CSP_DOMAINS = 20

export function validateCspDomains(domains) {
  if (!domains || !Array.isArray(domains)) return { valid: true }
  if (domains.length > MAX_CSP_DOMAINS) {
    return { valid: false, error: `Maximal ${MAX_CSP_DOMAINS} CSP-Domains erlaubt` }
  }
  for (const entry of domains) {
    if (typeof entry !== 'string' || !entry.trim()) {
      return { valid: false, error: 'Leere CSP-Domain-Eintraege sind nicht erlaubt' }
    }
    const domain = entry.trim()
    if (domain === '*') {
      return { valid: false, error: 'Wildcard "*" allein ist nicht erlaubt — verwende z.B. *.example.com' }
    }
    if (!CSP_DOMAIN_RE.test(domain)) {
      return { valid: false, error: `Ungueltige CSP-Domain: ${domain} (z.B. analytics.example.com oder *.umami.is)` }
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

// --- Cron-Job Validierung ---

const MAX_CRON_JOBS = 20

// Erlaubte Cron-Command Prefixe (erweitert gegenueber preBuildCmd)
const ALLOWED_CRON_CMD_PREFIXES = [
  ...ALLOWED_CMD_PREFIXES,
  'wp ',
  'drush ',
  'bin/console',
  'vendor/bin/',
  'python ',
  'python3 ',
  'bash ',
  'sh ',
]

// Cron-Schedule: 5-Felder Format (Minute Stunde Tag Monat Wochentag)
const CRON_FIELD_RANGES = [
  { name: 'Minute', min: 0, max: 59 },
  { name: 'Stunde', min: 0, max: 23 },
  { name: 'Tag', min: 1, max: 31 },
  { name: 'Monat', min: 1, max: 12 },
  { name: 'Wochentag', min: 0, max: 7 },
]

function validateCronField(field, range) {
  if (field === '*') return true
  // */n Pattern
  if (/^\*\/\d+$/.test(field)) {
    const step = parseInt(field.slice(2))
    return step >= 1 && step <= range.max
  }
  // Komma-separierte Werte und Bereiche
  const parts = field.split(',')
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number)
      if (isNaN(start) || isNaN(end) || start < range.min || end > range.max || start > end) return false
    } else if (part.includes('/')) {
      const [base, step] = part.split('/')
      if (base !== '*' && (isNaN(Number(base)) || Number(base) < range.min || Number(base) > range.max)) return false
      if (isNaN(Number(step)) || Number(step) < 1) return false
    } else {
      const num = Number(part)
      if (isNaN(num) || num < range.min || num > range.max) return false
    }
  }
  return true
}

export function validateCronSchedule(schedule) {
  if (!schedule || typeof schedule !== 'string') {
    return { valid: false, error: 'Cron-Schedule ist erforderlich' }
  }
  const trimmed = schedule.trim()
  const fields = trimmed.split(/\s+/)
  if (fields.length !== 5) {
    return { valid: false, error: 'Cron-Schedule muss 5 Felder haben (Minute Stunde Tag Monat Wochentag)' }
  }
  for (let i = 0; i < 5; i++) {
    if (!validateCronField(fields[i], CRON_FIELD_RANGES[i])) {
      return { valid: false, error: `Ungueltiger Wert fuer ${CRON_FIELD_RANGES[i].name}: ${fields[i]}` }
    }
  }
  return { valid: true }
}

export function validateCronCommand(command) {
  if (!command || typeof command !== 'string') {
    return { valid: false, error: 'Befehl ist erforderlich' }
  }
  const trimmed = command.trim()
  if (!trimmed) {
    return { valid: false, error: 'Befehl ist erforderlich' }
  }
  if (trimmed.length > 500) {
    return { valid: false, error: 'Befehl darf maximal 500 Zeichen lang sein' }
  }
  if (DANGEROUS_SHELL_CHARS.test(trimmed)) {
    return { valid: false, error: 'Befehl enthaelt ungueltige Zeichen (keine Shell-Operatoren erlaubt)' }
  }
  const allowed = ALLOWED_CRON_CMD_PREFIXES.some(prefix => trimmed.startsWith(prefix))
  if (!allowed) {
    return { valid: false, error: `Befehl muss mit einem erlaubten Prefix beginnen: ${ALLOWED_CRON_CMD_PREFIXES.join(', ')}` }
  }
  return { valid: true }
}

// Interne/private IP-Bereiche (SSRF-Prevention)
const INTERNAL_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]']
const INTERNAL_IP_RE = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/

export function validateCronUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL ist erforderlich' }
  }
  const trimmed = url.trim()
  if (!trimmed) {
    return { valid: false, error: 'URL ist erforderlich' }
  }
  if (trimmed.length > 2000) {
    return { valid: false, error: 'URL darf maximal 2000 Zeichen lang sein' }
  }
  let parsed
  try {
    parsed = new URL(trimmed)
  } catch {
    return { valid: false, error: 'Ungueltige URL' }
  }
  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'Nur HTTPS-URLs sind erlaubt' }
  }
  if (INTERNAL_HOSTS.includes(parsed.hostname) || INTERNAL_IP_RE.test(parsed.hostname)) {
    return { valid: false, error: 'Interne/private Adressen sind nicht erlaubt' }
  }
  return { valid: true }
}

export function validateCronJobCount(existing) {
  if (existing >= MAX_CRON_JOBS) {
    return { valid: false, error: `Maximal ${MAX_CRON_JOBS} Cron-Jobs pro Projekt erlaubt` }
  }
  return { valid: true }
}
