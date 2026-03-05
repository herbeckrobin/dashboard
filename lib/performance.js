import fs from 'fs'
import path from 'path'
import { runCommand } from './run-command'
import { getConfig, getDomainConfig } from './config'
import { runWebsiteChecks } from './website-checks'

const PERF_DIR = path.join(process.cwd(), 'data', 'performance')

// Verzeichnis anlegen falls nicht vorhanden
if (!fs.existsSync(PERF_DIR)) {
  fs.mkdirSync(PERF_DIR, { recursive: true })
}

function perfFilePath(projectId) {
  return path.join(PERF_DIR, `${projectId}.json`)
}

export function getPerformanceData(projectId) {
  try {
    return JSON.parse(fs.readFileSync(perfFilePath(projectId), 'utf8'))
  } catch {
    return { checks: [] }
  }
}

function savePerformanceData(projectId, data) {
  if (data.checks.length > 50) {
    data.checks = data.checks.slice(-50)
  }
  fs.writeFileSync(perfFilePath(projectId), JSON.stringify(data, null, 2))
}

export function getLatestScore(projectId) {
  const data = getPerformanceData(projectId)
  if (data.checks.length === 0) return null
  return data.checks[data.checks.length - 1]
}

export function getPerformanceHistory(projectId, limit = 10) {
  const data = getPerformanceData(projectId)
  return data.checks.slice(-limit).reverse()
}

export function deletePerformanceData(projectId) {
  const filePath = perfFilePath(projectId)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}

// In-Memory Status fuer laufende Checks
const checkStatus = {}

export function getCheckStatus(projectId) {
  return checkStatus[projectId] || null
}

async function runPageSpeedCheck(url) {
  const config = getConfig()
  const apiKey = config.pageSpeedApiKey || ''

  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO${apiKey ? '&key=' + apiKey : ''}`

  try {
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(60000) })
    if (!res.ok) {
      const text = await res.text()
      return { success: false, error: `PageSpeed API ${res.status}: ${text.slice(0, 200)}` }
    }
    const data = await res.json()
    const cats = data.lighthouseResult?.categories || {}
    return {
      success: true,
      scores: {
        performance: Math.round((cats.performance?.score || 0) * 100),
        accessibility: Math.round((cats.accessibility?.score || 0) * 100),
        bestPractices: Math.round((cats['best-practices']?.score || 0) * 100),
        seo: Math.round((cats.seo?.score || 0) * 100),
      }
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function runLighthouseCheck(url) {
  const cmd = `lighthouse "${url}" --output=json --chrome-flags="--headless --no-sandbox --disable-gpu" --only-categories=performance,accessibility,best-practices,seo --quiet 2>/dev/null`

  const result = await runCommand(cmd)
  if (!result.success) {
    return { success: false, error: result.error }
  }

  try {
    const report = JSON.parse(result.output)
    const cats = report.categories || {}
    const audits = report.audits || {}

    return {
      success: true,
      scores: {
        performance: Math.round((cats.performance?.score || 0) * 100),
        accessibility: Math.round((cats.accessibility?.score || 0) * 100),
        bestPractices: Math.round((cats['best-practices']?.score || 0) * 100),
        seo: Math.round((cats.seo?.score || 0) * 100),
      },
      webVitals: {
        fcp: Math.round(audits['first-contentful-paint']?.numericValue || 0),
        lcp: Math.round(audits['largest-contentful-paint']?.numericValue || 0),
        cls: parseFloat((audits['cumulative-layout-shift']?.numericValue || 0).toFixed(3)),
        tbt: Math.round(audits['total-blocking-time']?.numericValue || 0),
      }
    }
  } catch (err) {
    return { success: false, error: 'Lighthouse Output nicht parsebar: ' + err.message }
  }
}

export async function runPerformanceCheck(project, trigger = 'manual') {
  const { id, domain, passwordEnabled } = project

  if (!domain) {
    return { success: false, error: 'Kein Domain konfiguriert' }
  }

  if (passwordEnabled) {
    return { success: false, error: 'Website ist passwortgeschuetzt - Check uebersprungen' }
  }

  const url = `https://${domain}`
  const startTime = Date.now()

  checkStatus[id] = { status: 'checking', startedAt: new Date().toISOString(), step: 'pagespeed' }

  // 1. PageSpeed Check
  const pagespeed = await runPageSpeedCheck(url)

  checkStatus[id].step = 'lighthouse'

  // 2. Lighthouse Check
  const lighthouse = await runLighthouseCheck(url)

  // 3. Website Standards Check
  checkStatus[id].step = 'website-checks'
  let websiteChecks = null
  // Dev-Domains: Checks mit skipDev ueberspringen (z.B. Cookie-Consent)
  const { serverDomain } = getDomainConfig()
  const isDev = (serverDomain && domain.endsWith(`.${serverDomain}`)) || !domain.includes('.')
  try {
    websiteChecks = await runWebsiteChecks(domain, { isDev })
  } catch (err) {
    websiteChecks = { error: err.message, score: 0, totalChecks: 0, passedChecks: 0, categories: {} }
  }

  const durationMs = Date.now() - startTime

  const check = {
    id: `check_${Date.now()}`,
    timestamp: new Date().toISOString(),
    trigger,
    url,
    pagespeed: pagespeed.success ? pagespeed.scores : null,
    lighthouse: lighthouse.success ? { ...lighthouse.scores, ...lighthouse.webVitals } : null,
    pagespeedError: pagespeed.success ? null : pagespeed.error,
    lighthouseError: lighthouse.success ? null : lighthouse.error,
    websiteChecks,
    durationMs,
  }

  // Ergebnis speichern
  const data = getPerformanceData(id)
  data.checks.push(check)
  savePerformanceData(id, data)

  checkStatus[id] = { status: 'done', finishedAt: new Date().toISOString() }

  // Status nach 30s aufräumen
  setTimeout(() => { delete checkStatus[id] }, 30000)

  return { success: true, check }
}
