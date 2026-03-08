// Rule Engine — Desired-State System
// Laedt Rules, fuehrt Audits durch, enforced fehlgeschlagene Regeln

import { createRuleContext } from './context.js'
import { saveAudit, getLastAudit, calculateScore } from './storage.js'
import { getProjects } from '../db.js'

// Bootstrap Rule-Module
import certbotBootstrapRules from './bootstrap/certbot.js'
import phpBootstrapRules from './bootstrap/php.js'
import mariadbRules from './bootstrap/mariadb.js'
import dockerRules from './bootstrap/docker.js'
import giteaRules from './bootstrap/gitea.js'
import emailRules from './bootstrap/email.js'
import webhookRules from './bootstrap/webhook.js'
import backupBootstrapRules from './bootstrap/backup.js'
import cronsRules from './bootstrap/crons.js'

// Alle Rule-Module importieren
import sshRules from './security/ssh.js'
import firewallRules from './security/firewall.js'
import fail2banRules from './security/fail2ban.js'
import updatesRules from './security/updates.js'
import permissionsRules from './security/permissions.js'
import phpRules from './security/php.js'
import secretsRules from './security/secrets.js'
import headersRules from './security/headers.js'
import sudoRules from './security/sudo.js'
import sslExpiryRules from './monitoring/ssl-expiry.js'
import diskRules from './monitoring/disk.js'
import backupsRules from './monitoring/backups.js'
import servicesRules from './monitoring/services.js'
import nginxRules from './infra/nginx.js'
import sslRules from './infra/ssl.js'
import pm2Rules from './infra/pm2.js'
import databaseRules from './setup/database.js'
import wordpressRules from './setup/wordpress.js'
import redaxoRules from './setup/redaxo.js'
import typo3Rules from './setup/typo3.js'
import contaoRules from './setup/contao.js'
import laravelRules from './setup/laravel.js'
import nextjsRules from './setup/nextjs.js'
import expressRules from './setup/express.js'
import gitRules from './setup/git.js'

// Kategorien in Ausfuehrungsreihenfolge
const CATEGORY_ORDER = ['bootstrap', 'setup', 'security', 'infra', 'monitoring']

// Alle Rules nach Kategorie+Order sortiert
const ALL_RULES = [
  // Bootstrap
  ...certbotBootstrapRules,
  ...phpBootstrapRules,
  ...mariadbRules,
  ...dockerRules,
  ...giteaRules,
  ...emailRules,
  ...webhookRules,
  ...backupBootstrapRules,
  ...cronsRules,
  // Setup
  ...databaseRules,
  ...wordpressRules,
  ...redaxoRules,
  ...typo3Rules,
  ...contaoRules,
  ...laravelRules,
  ...nextjsRules,
  ...expressRules,
  ...gitRules,
  // Security
  ...sshRules,
  ...firewallRules,
  ...fail2banRules,
  ...updatesRules,
  ...permissionsRules,
  ...phpRules,
  ...secretsRules,
  ...headersRules,
  ...sudoRules,
  // Infra
  ...nginxRules,
  ...sslRules,
  ...pm2Rules,
  // Monitoring
  ...sslExpiryRules,
  ...diskRules,
  ...backupsRules,
  ...servicesRules,
].sort((a, b) => {
  // Erst nach Kategorie-Reihenfolge
  const catA = CATEGORY_ORDER.indexOf(a.category)
  const catB = CATEGORY_ORDER.indexOf(b.category)
  if (catA !== catB) return catA - catB
  // Dann nach Order
  return (a.order || 50) - (b.order || 50)
})

// In-Memory Audit-Status (Pattern aus performance.js)
let auditStatus = null

// In-Memory Enforce-Status (fuer Bootstrap-Fortschritt im UI)
let enforceStatus = null

export function getEnforceStatus() {
  return enforceStatus
}

export function loadRules() {
  return ALL_RULES
}

// Rules filtern nach scope und framework
export function getApplicableRules(project = null) {
  return ALL_RULES.filter(rule => {
    // Scope pruefen
    if (project === null && rule.scope === 'project') return false
    if (project !== null && rule.scope === 'server') return false

    // Framework-Filter (nur bei project-scope)
    if (project && rule.frameworks) {
      const framework = project.framework || ''
      if (!rule.frameworks.includes(framework)) return false
    }

    return true
  })
}

// Audit ausfuehren — prueft alle Regeln
export async function runAudit(options = {}) {
  const { projectId, categories } = options

  if (auditStatus?.status === 'running') {
    return { error: 'Audit laeuft bereits' }
  }

  const auditStartedAt = new Date().toISOString()
  auditStatus = { status: 'running', startedAt: auditStartedAt, step: 'init' }

  try {
    const results = []
    const projects = getProjects().filter(p => p.status === 'running' || p.frameworkInstalled)

    // Server-Regeln pruefen
    auditStatus.step = 'server'
    const serverRules = getApplicableRules(null)
    const filteredServerRules = categories
      ? serverRules.filter(r => categories.includes(r.category))
      : serverRules

    const serverCtx = createRuleContext(null)
    for (const rule of filteredServerRules) {
      try {
        const result = await rule.audit(serverCtx)
        results.push({
          ruleId: rule.id,
          name: rule.name,
          category: rule.category,
          scope: 'server',
          severity: rule.severity,
          passed: result.passed,
          actual: result.actual,
          expected: result.expected,
          enforceable: rule.enforce !== null && rule.enforce !== undefined,
        })
      } catch (err) {
        results.push({
          ruleId: rule.id,
          name: rule.name,
          category: rule.category,
          scope: 'server',
          severity: rule.severity,
          passed: false,
          actual: `Fehler: ${err.message}`,
          expected: '-',
          enforceable: false,
          error: true,
        })
      }
    }

    // Projekt-Regeln pruefen
    const projectsToCheck = projectId
      ? projects.filter(p => p.id === projectId)
      : projects

    for (const project of projectsToCheck) {
      auditStatus.step = `project:${project.name}`
      const projectRules = getApplicableRules(project)
      const filteredProjectRules = categories
        ? projectRules.filter(r => categories.includes(r.category))
        : projectRules

      const projectCtx = createRuleContext(project)
      for (const rule of filteredProjectRules) {
        try {
          const result = await rule.audit(projectCtx)
          results.push({
            ruleId: rule.id,
            name: rule.name,
            category: rule.category,
            scope: 'project',
            projectId: project.id,
            projectName: project.name,
            severity: rule.severity,
            passed: result.passed,
            actual: result.actual,
            expected: result.expected,
            enforceable: rule.enforce !== null && rule.enforce !== undefined,
          })
        } catch (err) {
          results.push({
            ruleId: rule.id,
            name: rule.name,
            category: rule.category,
            scope: 'project',
            projectId: project.id,
            projectName: project.name,
            severity: rule.severity,
            passed: false,
            actual: `Fehler: ${err.message}`,
            expected: '-',
            enforceable: false,
            error: true,
          })
        }
      }
    }

    const score = calculateScore(results)
    const passed = results.filter(r => r.passed).length
    const failed = results.filter(r => !r.passed).length

    const audit = {
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      trigger: options.trigger || 'manual',
      score,
      totalRules: results.length,
      passed,
      failed,
      results,
      durationMs: Date.now() - new Date(auditStartedAt).getTime(),
    }

    saveAudit(audit)

    auditStatus = { status: 'done', finishedAt: new Date().toISOString() }
    // Status nach 30s aufraeumen (nur wenn noch 'done', nicht wenn neuer Audit laeuft)
    setTimeout(() => { if (auditStatus?.status === 'done') auditStatus = null }, 30000)

    return audit
  } catch (err) {
    auditStatus = { status: 'error', error: err.message }
    setTimeout(() => { if (auditStatus?.status === 'error') auditStatus = null }, 30000)
    throw err
  }
}

// Einzelne Rule enforcen (idempotent)
export async function enforceRule(ruleId, projectId = null) {
  const rule = ALL_RULES.find(r => r.id === ruleId)
  if (!rule) return { error: `Rule ${ruleId} nicht gefunden` }
  if (!rule.enforce) return { error: `Rule ${ruleId} ist nicht enforceable (manueller Fix noetig)` }

  const project = projectId ? getProjects().find(p => p.id === projectId) : null
  const ctx = createRuleContext(project)

  // Idempotent: Erst pruefen ob schon OK
  const auditResult = await rule.audit(ctx)
  if (auditResult.passed) {
    return { changed: false, ruleId, message: 'Bereits OK' }
  }

  // Enforce ausfuehren
  const enforceResult = await rule.enforce(ctx)

  // Verifikation: Re-Audit
  const verifyResult = await rule.audit(ctx)

  return {
    changed: enforceResult?.changed ?? true,
    verified: verifyResult.passed,
    ruleId,
    projectId,
    actual: verifyResult.actual,
    meta: enforceResult?.meta,
  }
}

// Alle fehlgeschlagenen enforceable Rules fixen
export async function enforceAll(options = {}) {
  const { projectId, categories } = options
  const results = []
  let enforced = 0
  let skipped = 0
  let failed = 0

  const projects = getProjects().filter(p => p.status === 'running' || p.frameworkInstalled)

  // Alle enforceable Rules zaehlen fuer Fortschritt
  const allEnforceable = []
  if (!projectId) {
    const serverRules = getApplicableRules(null).filter(r => r.enforce)
    const filtered = categories ? serverRules.filter(r => categories.includes(r.category)) : serverRules
    filtered.forEach(r => allEnforceable.push({ rule: r, projectId: null }))
  }
  const projectsToEnforce = projectId
    ? projects.filter(p => p.id === projectId)
    : projects
  for (const project of projectsToEnforce) {
    const projectRules = getApplicableRules(project).filter(r => r.enforce)
    const filtered = categories ? projectRules.filter(r => categories.includes(r.category)) : projectRules
    filtered.forEach(r => allEnforceable.push({ rule: r, projectId: project.id }))
  }

  const total = allEnforceable.length
  let current = 0

  enforceStatus = {
    status: 'running',
    startedAt: new Date().toISOString(),
    total,
    current: 0,
    currentRule: null,
    enforced: 0,
    skipped: 0,
    failed: 0,
  }

  for (const { rule, projectId: pId } of allEnforceable) {
    current++
    enforceStatus = {
      ...enforceStatus,
      current,
      currentRule: rule.name,
      currentCategory: rule.category,
      enforced,
      skipped,
      failed,
    }

    try {
      const result = await enforceRule(rule.id, pId)
      if (result.error) { skipped++; continue }
      if (!result.changed) { skipped++; continue }
      if (result.verified) { enforced++ } else { failed++ }
      results.push(result)
    } catch (err) {
      failed++
      results.push({ ruleId: rule.id, projectId: pId, error: err.message })
    }
  }

  enforceStatus = {
    status: 'done',
    startedAt: enforceStatus.startedAt,
    finishedAt: new Date().toISOString(),
    total,
    current: total,
    currentRule: null,
    enforced,
    skipped,
    failed,
  }
  // Status nach 60s aufraeumen
  setTimeout(() => { enforceStatus = null }, 60000)

  return { enforced, skipped, failed, results }
}

export function getAuditStatus() {
  return auditStatus
}

export { getLastAudit } from './storage.js'
