import https from 'https'
import fs from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

// Performance-Vorgaben als zentrale Konfiguration laden
const requirementsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'performance-requirements.json')
const requirements = JSON.parse(fs.readFileSync(requirementsPath, 'utf8'))

const TIMEOUT = 10000

async function checkSSLCertificate(domain) {
  return new Promise((resolve) => {
    const req = https.get(`https://${domain}`, {
      timeout: TIMEOUT,
      rejectUnauthorized: false
    }, (res) => {
      const cert = res.socket.getPeerCertificate()
      resolve({
        valid: res.socket.authorized !== false,
        expiry: cert.valid_to || null
      })
      res.destroy()
    })
    req.on('error', () => resolve({ valid: false, expiry: null }))
    req.on('timeout', () => { req.destroy(); resolve({ valid: false, expiry: null }) })
  })
}

async function checkHttpRedirect(domain) {
  try {
    const res = await fetch(`http://${domain}`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT)
    })
    const location = res.headers.get('location') || ''
    return location.startsWith('https://')
  } catch {
    return false
  }
}

async function fetchHTML(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) })
    if (!res.ok) return null
    const html = await res.text()
    const headers = {}
    for (const [key, value] of res.headers) headers[key] = value
    return { html, headers }
  } catch {
    return null
  }
}

async function checkUrlExists(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    const ok = res.ok
    await res.text().catch(() => {})
    return ok
  } catch {
    return false
  }
}

// Check-Funktionen pro ID — jede gibt { passed, info? } zurueck
function getCheckFunctions({ domain, html, htmlLower, headers, sslInfo, redirectsToHttps,
                             hasFaviconFile, hasRobotsTxt, hasSitemapXml, titleMatch, hasMeta }) {
  const h = (name) => headers[name.toLowerCase()] || ''

  const cookieKeywords = [
    'cookie-consent', 'cookieconsent', 'cookie-banner', 'cookie-notice',
    'cookiebot', 'onetrust', 'cc-window', 'consent-manager',
    'tarteaucitron', 'klaro', 'cookie-law', 'gdpr-consent'
  ]

  const htmlHasFavicon = /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*>/i.test(html)

  return {
    // SSL / HTTPS
    'ssl-cert': () => ({
      passed: sslInfo.valid,
      info: sslInfo.expiry ? `Gültig bis ${new Date(sslInfo.expiry).toLocaleDateString('de-DE')}` : null
    }),
    'https-redirect': () => ({ passed: redirectsToHttps }),

    // Icons & Manifest
    'favicon': () => ({ passed: htmlHasFavicon || hasFaviconFile }),
    'apple-touch-icon': () => ({ passed: /<link[^>]*rel=["']apple-touch-icon["'][^>]*>/i.test(html) }),
    'manifest': () => ({ passed: /<link[^>]*rel=["']manifest["'][^>]*>/i.test(html) }),

    // Meta-Tags
    'html-lang': () => ({ passed: /<html[^>]*\slang=["'][^"']+["']/i.test(html) }),
    'charset': () => ({ passed: /<meta[^>]*charset/i.test(html) }),
    'viewport': () => ({ passed: hasMeta('name', 'viewport') }),
    'title': () => ({ passed: !!(titleMatch && titleMatch[1].trim()) }),
    'description': () => ({ passed: hasMeta('name', 'description') }),
    'og-tags': () => ({ passed: hasMeta('property', 'og:title') }),
    'og-image': () => ({ passed: hasMeta('property', 'og:image') }),

    // Rechtliches
    'impressum': () => ({
      passed: /href=["'][^"']*impressum/i.test(html) || htmlLower.includes('>impressum<')
    }),
    'datenschutz': () => ({
      passed: /href=["'][^"']*(?:datenschutz|privacy)/i.test(html) || />\s*datenschutz/i.test(html)
    }),

    // Cookie / DSGVO
    'cookie-consent': () => ({
      passed: cookieKeywords.some(k => htmlLower.includes(k)),
      info: 'Prüft ob ein Consent-Banner im HTML erkennbar ist'
    }),

    // Security Headers
    'x-content-type-options': () => ({ passed: h('x-content-type-options').includes('nosniff') }),
    'x-frame-options': () => ({ passed: !!h('x-frame-options') || h('content-security-policy').includes('frame-ancestors') }),
    'hsts': () => ({ passed: !!h('strict-transport-security') }),
    'referrer-policy': () => ({ passed: !!h('referrer-policy') }),

    // SEO Basics
    'robots-txt': () => ({ passed: hasRobotsTxt }),
    'sitemap': () => ({ passed: hasSitemapXml }),
    'h1-tag': () => ({ passed: /<h1[\s>]/i.test(html) }),
    'canonical': () => ({ passed: /<link[^>]*rel=["']canonical["']/i.test(html) }),
  }
}

/**
 * Website-Standards pruefen — Checks werden aus performance-requirements.json geladen.
 *
 * @param {string} domain - Domain die geprueft wird
 * @param {{ isDev?: boolean }} options - isDev: ueberspringt Checks mit skipDev
 */
export async function runWebsiteChecks(domain, { isDev = false } = {}) {
  const startTime = Date.now()
  const categories = {}

  // Parallel fetches
  const [sslInfo, redirectsToHttps, page, hasFaviconFile, hasRobotsTxt, hasSitemapXml] = await Promise.all([
    checkSSLCertificate(domain),
    checkHttpRedirect(domain),
    fetchHTML(`https://${domain}`).then(r => r || fetchHTML(`http://${domain}`)),
    checkUrlExists(`https://${domain}/favicon.ico`),
    checkUrlExists(`https://${domain}/robots.txt`),
    checkUrlExists(`https://${domain}/sitemap.xml`)
  ])

  const html = page?.html || ''
  const htmlLower = html.toLowerCase()
  const headers = page?.headers || {}
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const metaTags = html.match(/<meta[^>]*>/gi) || []
  const hasMeta = (attr, val) => metaTags.some(m =>
    new RegExp(`${attr}=["']${val}["']`, 'i').test(m) && /content=["'][^"']+/i.test(m)
  )

  // Check-Funktionen initialisieren
  const checkFns = getCheckFunctions({
    domain, html, htmlLower, headers, sslInfo, redirectsToHttps,
    hasFaviconFile, hasRobotsTxt, hasSitemapXml, titleMatch, hasMeta
  })

  // Kategorien aus JSON aufbauen
  for (const [catKey, cat] of Object.entries(requirements.categories)) {
    const checks = []

    for (const checkDef of cat.checks) {
      // skipDev: Check ueberspringen bei Dev-Domains
      if (checkDef.skipDev && isDev) continue

      const fn = checkFns[checkDef.id]
      if (!fn) {
        // Unbekannter Check — als fehlgeschlagen markieren
        checks.push({ name: checkDef.name, passed: false, info: 'Check nicht implementiert' })
        continue
      }

      const result = fn()
      checks.push({ name: checkDef.name, passed: result.passed, ...(result.info ? { info: result.info } : {}) })
    }

    categories[catKey] = { name: cat.name, checks }
  }

  // Scores pro Kategorie und gesamt berechnen
  let totalChecks = 0, passedChecks = 0
  for (const cat of Object.values(categories)) {
    cat.passed = cat.checks.filter(c => c.passed).length
    cat.total = cat.checks.length
    cat.score = cat.total > 0 ? Math.round((cat.passed / cat.total) * 100) : 100
    totalChecks += cat.total
    passedChecks += cat.passed
  }

  return {
    score: totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0,
    totalChecks,
    passedChecks,
    categories,
    durationMs: Date.now() - startTime
  }
}
