// Rule Engine — Desired-State System
// Laedt Rules, fuehrt Audits durch, enforced fehlgeschlagene Regeln

import { createRuleContext } from './context.js'
import { saveAudit, getLastAudit, calculateScore } from './storage.js'
import { getProjects } from '../db.js'

// Alle Rule-Module importieren
import sshRules from './security/ssh.js'
import firewallRules from './security/firewall.js'
import fail2banRules from './security/fail2ban.js'
import updatesRules from './security/updates.js'
import permissionsRules from './security/permissions.js'
import phpRules from './security/php.js'
import secretsRules from './security/secrets.js'
import headersRules from './security/headers.js'
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
const CATEGORY_ORDER = ['setup', 'security', 'infra', 'monitoring']

// Alle Rules nach Kategorie+Order sortiert
const ALL_RULES = [
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

  auditStatus = { status: 'running', startedAt: new Date().toISOString(), step: 'init' }

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
      durationMs: Date.now() - new Date(auditStatus.startedAt).getTime(),
    }

    saveAudit(audit)

    auditStatus = { status: 'done', finishedAt: new Date().toISOString() }
    // Status nach 30s aufraeumen
    setTimeout(() => { auditStatus = null }, 30000)

    return audit
  } catch (err) {
    auditStatus = { status: 'error', error: err.message }
    setTimeout(() => { auditStatus = null }, 30000)
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

  // Server-Regeln
  if (!projectId) {
    const serverRules = getApplicableRules(null).filter(r => r.enforce)
    const filtered = categories ? serverRules.filter(r => categories.includes(r.category)) : serverRules
    const ctx = createRuleContext(null)

    for (const rule of filtered) {
      try {
        const result = await enforceRule(rule.id, null)
        if (result.error) { skipped++; continue }
        if (!result.changed) { skipped++; continue }
        if (result.verified) { enforced++ } else { failed++ }
        results.push(result)
      } catch (err) {
        failed++
        results.push({ ruleId: rule.id, error: err.message })
      }
    }
  }

  // Projekt-Regeln
  const projectsToEnforce = projectId
    ? projects.filter(p => p.id === projectId)
    : projects

  for (const project of projectsToEnforce) {
    const projectRules = getApplicableRules(project).filter(r => r.enforce)
    const filtered = categories ? projectRules.filter(r => categories.includes(r.category)) : projectRules

    for (const rule of filtered) {
      try {
        const result = await enforceRule(rule.id, project.id)
        if (result.error) { skipped++; continue }
        if (!result.changed) { skipped++; continue }
        if (result.verified) { enforced++ } else { failed++ }
        results.push(result)
      } catch (err) {
        failed++
        results.push({ ruleId: rule.id, projectId: project.id, error: err.message })
      }
    }
  }

  return { enforced, skipped, failed, results }
}

export function getAuditStatus() {
  return auditStatus
}

export { getLastAudit } from './storage.js'
