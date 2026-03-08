// Baut das Kontext-Objekt fuer Rule audit() und enforce() Funktionen

import fs from 'fs'
import path from 'path'
import { runCommand, runQuick } from '../run-command.js'
import { escapeShellArg, sanitizeSqlIdentifier, escapeSqlValue } from '../validate.js'
import { getProjects, getProject } from '../db.js'
import { getConfig } from '../config.js'

// Wrapper: runCmd gibt nur den Output-String zurueck (vereinfacht Rule-Code)
async function runCmd(cmd, opts = {}) {
  const timeout = opts.timeout || 30000
  const result = await runCommand(cmd, timeout)
  if (!result.success) {
    if (opts.throwOnError) throw new Error(result.error)
    return result.error || ''
  }
  return result.output || ''
}

// Wrapper: runQuickCmd mit kurzem Timeout
async function runQuickCmd(cmd, timeoutMs = 5000) {
  return await runQuick(cmd, timeoutMs)
}

// nginx Config via temp file + sudo mv schreiben (Pattern aus deploy.js)
async function writeNginxConfig(domain, configContent) {
  const tmpPath = `/tmp/nginx-${domain}.conf`
  fs.writeFileSync(tmpPath, configContent)
  const result = await runCommand(`sudo mv ${tmpPath} /etc/nginx/sites-available/${domain}`)
  if (!result.success) throw new Error(`nginx Config schreiben fehlgeschlagen: ${result.error}`)
}

export function createRuleContext(project = null, onOutput = null) {
  return {
    project,
    runCmd,
    runQuick: runQuickCmd,
    writeNginxConfig,
    getProjects,
    getProject,
    escapeShellArg,
    sanitizeSqlIdentifier,
    escapeSqlValue,
    getConfig,
    onOutput: onOutput || (() => {}),
  }
}
