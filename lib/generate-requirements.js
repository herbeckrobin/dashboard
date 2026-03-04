import fs from 'fs'
import path from 'path'
import { getGoogleFontsUrl } from './theme-defaults.js'

// Performance-Vorgaben laden
const requirementsPath = new URL('./performance-requirements.json', import.meta.url)
const requirements = JSON.parse(fs.readFileSync(requirementsPath, 'utf8'))

// Generatable Check-IDs aus der JSON-Konfiguration extrahieren
function getGeneratableIds() {
  const ids = []
  for (const cat of Object.values(requirements.categories)) {
    for (const check of cat.checks) {
      if (check.generatable) ids.push(check.id)
    }
  }
  return ids
}

// ============================================================
// NEXT.JS GENERATOREN
// ============================================================

function applyNextjsRequirements(projectPath, project, siteData, ids) {
  const applied = []
  const domain = project.domain || `${project.name}.rhdemo.de`
  const baseUrl = `https://${domain}`

  // layout.tsx mit erweiterter Metadata neu schreiben (OG-Tags, Canonical, Icons)
  if (ids.includes('og-tags') || ids.includes('canonical')) {
    const googleFontsUrl = getGoogleFontsUrl(siteData.theme?.font)
    const fontsLink = googleFontsUrl
      ? `\n        <link rel="preconnect" href="https://fonts.googleapis.com" />\n        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />\n        <link rel="stylesheet" href="${googleFontsUrl}" />`
      : ''

    const layoutContent = `import './globals.scss'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL(${JSON.stringify(baseUrl)}),
  title: ${JSON.stringify(siteData.meta?.title || project.name)},
  description: ${JSON.stringify(siteData.meta?.description || '')},
  openGraph: {
    title: ${JSON.stringify(siteData.meta?.title || project.name)},
    description: ${JSON.stringify(siteData.meta?.description || '')},
    url: ${JSON.stringify(baseUrl)},
    siteName: ${JSON.stringify(siteData.meta?.title || project.name)},
    type: 'website',
    locale: 'de_DE',
  },
  alternates: {
    canonical: '/',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>${fontsLink}
      </head>
      <body>{children}</body>
    </html>
  )
}
`
    fs.writeFileSync(path.join(projectPath, 'app/layout.tsx'), layoutContent, 'utf8')
    if (ids.includes('og-tags')) applied.push('og-tags')
    if (ids.includes('canonical')) applied.push('canonical')
  }

  // Favicon als SVG (nutzt Primary-Color aus Theme)
  if (ids.includes('favicon')) {
    const primary = siteData.theme?.primary || '#1e40af'
    const initial = (project.name || 'A').charAt(0).toUpperCase()
    const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="${primary}"/>
  <text x="16" y="23" font-family="system-ui,sans-serif" font-size="20" font-weight="700" fill="white" text-anchor="middle">${initial}</text>
</svg>`
    fs.writeFileSync(path.join(projectPath, 'app/icon.svg'), svgFavicon, 'utf8')
    applied.push('favicon')
  }

  // Apple Touch Icon (referenziert ueber Metadata API)
  if (ids.includes('apple-touch-icon')) {
    // Next.js erkennt app/apple-icon.* automatisch
    const primary = siteData.theme?.primary || '#1e40af'
    const initial = (project.name || 'A').charAt(0).toUpperCase()
    const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
  <rect width="180" height="180" rx="36" fill="${primary}"/>
  <text x="90" y="125" font-family="system-ui,sans-serif" font-size="110" font-weight="700" fill="white" text-anchor="middle">${initial}</text>
</svg>`
    fs.writeFileSync(path.join(projectPath, 'app/apple-icon.svg'), svgIcon, 'utf8')
    applied.push('apple-touch-icon')
  }

  // Web App Manifest
  if (ids.includes('manifest')) {
    const manifestContent = `import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: ${JSON.stringify(siteData.meta?.title || project.name)},
    short_name: ${JSON.stringify(project.name)},
    description: ${JSON.stringify(siteData.meta?.description || '')},
    start_url: '/',
    display: 'standalone',
    background_color: ${JSON.stringify(siteData.theme?.background || '#ffffff')},
    theme_color: ${JSON.stringify(siteData.theme?.primary || '#1e40af')},
  }
}
`
    fs.writeFileSync(path.join(projectPath, 'app/manifest.ts'), manifestContent, 'utf8')
    applied.push('manifest')
  }

  // robots.txt
  if (ids.includes('robots-txt')) {
    const robotsContent = `import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: ${JSON.stringify(`${baseUrl}/sitemap.xml`)},
  }
}
`
    fs.writeFileSync(path.join(projectPath, 'app/robots.ts'), robotsContent, 'utf8')
    applied.push('robots-txt')
  }

  // Sitemap
  if (ids.includes('sitemap')) {
    const sitemapContent = `import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: ${JSON.stringify(baseUrl)}, lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    { url: ${JSON.stringify(`${baseUrl}/impressum`)}, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: ${JSON.stringify(`${baseUrl}/datenschutz`)}, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]
}
`
    fs.writeFileSync(path.join(projectPath, 'app/sitemap.ts'), sitemapContent, 'utf8')
    applied.push('sitemap')
  }

  // Impressum (Platzhalter-Seite)
  if (ids.includes('impressum')) {
    const dir = path.join(projectPath, 'app/impressum')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'page.tsx'), `import Link from 'next/link'

export const metadata = {
  title: 'Impressum',
}

export default function ImpressumPage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 1.5rem' }}>
      <h1>Impressum</h1>
      <p style={{ marginTop: '2rem', color: 'var(--color-text-muted)' }}>
        Angaben gemaess § 5 TMG
      </p>
      <div style={{ marginTop: '1.5rem', lineHeight: 1.8 }}>
        <p><strong>Muster GmbH</strong></p>
        <p>Musterstrasse 1<br />12345 Musterstadt</p>
        <p style={{ marginTop: '1rem' }}>Telefon: +49 (0) 123 456789<br />E-Mail: info@example.de</p>
        <p style={{ marginTop: '1rem' }}>Vertretungsberechtigter Geschaeftsfuehrer: Max Mustermann</p>
        <p style={{ marginTop: '1rem' }}>Registergericht: Amtsgericht Musterstadt<br />Registernummer: HRB 12345</p>
        <p style={{ marginTop: '1rem' }}>Umsatzsteuer-ID: DE123456789</p>
      </div>
      <p style={{ marginTop: '3rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
        Bitte ersetzen Sie diese Platzhalter-Daten durch Ihre echten Angaben.
      </p>
      <Link href="/" style={{ display: 'inline-block', marginTop: '2rem', color: 'rgb(var(--color-primary))' }}>
        &larr; Zurueck zur Startseite
      </Link>
    </main>
  )
}
`, 'utf8')
    applied.push('impressum')
  }

  // Datenschutz (Platzhalter-Seite)
  if (ids.includes('datenschutz')) {
    const dir = path.join(projectPath, 'app/datenschutz')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'page.tsx'), `import Link from 'next/link'

export const metadata = {
  title: 'Datenschutzerklaerung',
}

export default function DatenschutzPage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 1.5rem' }}>
      <h1>Datenschutzerklaerung</h1>

      <section style={{ marginTop: '2rem' }}>
        <h2>1. Datenschutz auf einen Blick</h2>
        <p style={{ marginTop: '0.5rem', lineHeight: 1.8 }}>
          Die folgenden Hinweise geben einen einfachen Ueberblick darueber, was mit Ihren
          personenbezogenen Daten passiert, wenn Sie diese Website besuchen.
        </p>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>2. Hosting</h2>
        <p style={{ marginTop: '0.5rem', lineHeight: 1.8 }}>
          Diese Website wird bei einem externen Dienstleister gehostet (Hoster).
          Die personenbezogenen Daten, die auf dieser Website erfasst werden,
          werden auf den Servern des Hosters gespeichert.
        </p>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>3. Allgemeine Hinweise und Pflichtinformationen</h2>
        <p style={{ marginTop: '0.5rem', lineHeight: 1.8 }}>
          Die Betreiber dieser Seiten nehmen den Schutz Ihrer persoenlichen Daten sehr ernst.
          Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend den gesetzlichen
          Datenschutzvorschriften sowie dieser Datenschutzerklaerung.
        </p>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>4. Datenerfassung auf dieser Website</h2>
        <p style={{ marginTop: '0.5rem', lineHeight: 1.8 }}>
          Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber.
          Dessen Kontaktdaten koennen Sie dem Impressum dieser Website entnehmen.
        </p>
      </section>

      <p style={{ marginTop: '3rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
        Bitte ersetzen Sie diesen Platzhalter-Text durch Ihre vollstaendige Datenschutzerklaerung.
      </p>
      <Link href="/" style={{ display: 'inline-block', marginTop: '2rem', color: 'rgb(var(--color-primary))' }}>
        &larr; Zurueck zur Startseite
      </Link>
    </main>
  )
}
`, 'utf8')
    applied.push('datenschutz')
  }

  // html-lang, charset, viewport, title, description, h1-tag: Bereits durch bestehende Generierung abgedeckt
  for (const id of ['html-lang', 'charset', 'viewport', 'title', 'description', 'h1-tag']) {
    if (ids.includes(id)) applied.push(id)
  }

  return applied
}

// ============================================================
// WORDPRESS GENERATOREN
// ============================================================

function applyWpRequirements(themePath, project, siteData, ids) {
  const applied = []
  const domain = project.domain || `${project.name}.rhdemo.de`
  const baseUrl = `https://${domain}`

  // Assets-Verzeichnis sicherstellen
  const assetsDir = path.join(themePath, 'assets')
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true })

  // Favicon SVG ins Theme schreiben
  if (ids.includes('favicon')) {
    const primary = siteData.theme?.primary || '#1e40af'
    const initial = (project.name || 'A').charAt(0).toUpperCase()
    const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="${primary}"/>
  <text x="16" y="23" font-family="system-ui,sans-serif" font-size="20" font-weight="700" fill="white" text-anchor="middle">${initial}</text>
</svg>`
    fs.writeFileSync(path.join(assetsDir, 'favicon.svg'), svgFavicon, 'utf8')
    applied.push('favicon')
  }

  // manifest.json erstellen
  if (ids.includes('manifest')) {
    const manifest = {
      name: siteData.meta?.title || project.name,
      short_name: project.name,
      description: siteData.meta?.description || '',
      start_url: '/',
      display: 'standalone',
      background_color: siteData.theme?.background || '#ffffff',
      theme_color: siteData.theme?.primary || '#1e40af',
    }
    fs.writeFileSync(path.join(assetsDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
    applied.push('manifest')
  }

  // PHP-Ergaenzungen an functions.php anhaengen
  // (wp_head Hooks fuer Meta-Tags, Favicon, OG, Manifest)
  const phpAdditions = []
  const metaDesc = siteData.meta?.description || ''

  // Meta Description (WP gibt das nicht automatisch aus)
  if (ids.includes('description') && metaDesc) {
    phpAdditions.push(`
// Meta Description
function meta_description() {
    if (is_front_page()) {
        echo '<meta name="description" content="' . esc_attr(get_bloginfo('description')) . '" />' . "\\n";
    }
}
add_action('wp_head', __NAMESPACE__ . '\\\\meta_description', 3);`)
    applied.push('description')
  }

  // Open Graph Meta-Tags
  if (ids.includes('og-tags')) {
    phpAdditions.push(`
// Open Graph Meta-Tags
function og_meta_tags() {
    if (is_front_page()) {
        echo '<meta property="og:type" content="website" />' . "\\n";
        echo '<meta property="og:title" content="' . esc_attr(get_bloginfo('name')) . '" />' . "\\n";
        echo '<meta property="og:description" content="' . esc_attr(get_bloginfo('description')) . '" />' . "\\n";
        echo '<meta property="og:url" content="' . esc_url(home_url('/')) . '" />' . "\\n";
        echo '<meta property="og:locale" content="de_DE" />' . "\\n";
    }
}
add_action('wp_head', __NAMESPACE__ . '\\\\og_meta_tags', 5);`)
    applied.push('og-tags')
  }

  // Favicon Link-Tag
  if (ids.includes('favicon')) {
    phpAdditions.push(`
// Favicon einbinden
function custom_favicon() {
    echo '<link rel="icon" type="image/svg+xml" href="' . get_template_directory_uri() . '/assets/favicon.svg" />' . "\\n";
}
add_action('wp_head', __NAMESPACE__ . '\\\\custom_favicon', 1);`)
  }

  // Apple Touch Icon
  if (ids.includes('apple-touch-icon')) {
    phpAdditions.push(`
// Apple Touch Icon
function apple_touch_icon() {
    echo '<link rel="apple-touch-icon" href="' . get_template_directory_uri() . '/assets/favicon.svg" />' . "\\n";
}
add_action('wp_head', __NAMESPACE__ . '\\\\apple_touch_icon', 1);`)
    applied.push('apple-touch-icon')
  }

  // Web App Manifest Link-Tag
  if (ids.includes('manifest')) {
    phpAdditions.push(`
// Web App Manifest
function web_manifest() {
    echo '<link rel="manifest" href="' . get_template_directory_uri() . '/assets/manifest.json" />' . "\\n";
}
add_action('wp_head', __NAMESPACE__ . '\\\\web_manifest', 1);`)
  }

  // Impressum/Datenschutz: WP-Seiten erstellen bei Theme-Aktivierung + Footer-Links
  const legalPages = []
  if (ids.includes('impressum')) legalPages.push({ slug: 'impressum', title: 'Impressum' })
  if (ids.includes('datenschutz')) legalPages.push({ slug: 'datenschutz', title: 'Datenschutzerklaerung' })

  if (legalPages.length > 0) {
    const pageCreations = legalPages.map(p =>
      `    if (!get_page_by_path('${p.slug}')) {
        wp_insert_post([
            'post_title' => '${p.title}',
            'post_name' => '${p.slug}',
            'post_content' => '<!-- wp:paragraph --><p>Bitte ergaenzen Sie hier Ihre ${p.title}.</p><!-- /wp:paragraph -->',
            'post_status' => 'publish',
            'post_type' => 'page',
        ]);
    }`
    ).join('\n')

    phpAdditions.push(`
// Impressum/Datenschutz-Seiten automatisch anlegen
function create_legal_pages() {
${pageCreations}
}
add_action('after_switch_theme', __NAMESPACE__ . '\\\\create_legal_pages');
// Auch bei init einmalig ausfuehren (falls Theme bereits aktiv)
function create_legal_pages_once() {
    if (get_option('_legal_pages_created')) return;
    create_legal_pages();
    update_option('_legal_pages_created', '1');
}
add_action('init', __NAMESPACE__ . '\\\\create_legal_pages_once');`)

    // Footer-Links ausgeben (damit der Performance-Check die Links findet)
    const footerLinks = legalPages.map(p =>
      `        echo '<a href="/' . '${p.slug}">${p.title}</a> ';`
    ).join('\n')

    phpAdditions.push(`
// Rechtliche Links im Footer
function legal_footer_links() {
    echo '<div style="text-align:center;padding:1rem;font-size:0.8rem;opacity:0.7;">';
${footerLinks}
    echo '</div>';
}
add_action('wp_footer', __NAMESPACE__ . '\\\\legal_footer_links');`)

    for (const p of legalPages) applied.push(p.slug)
  }

  // PHP-Ergaenzungen an functions.php anhaengen
  if (phpAdditions.length > 0) {
    const functionsPath = path.join(themePath, 'functions.php')
    if (fs.existsSync(functionsPath)) {
      const existing = fs.readFileSync(functionsPath, 'utf8')
      fs.writeFileSync(functionsPath, existing + '\n' + phpAdditions.join('\n'), 'utf8')
    }
  }

  // WordPress Built-in: robots.txt, sitemap, canonical
  for (const id of ['robots-txt', 'sitemap', 'canonical']) {
    if (ids.includes(id)) applied.push(id)
  }

  // Bereits durch WP/Template abgedeckt
  for (const id of ['html-lang', 'charset', 'viewport', 'title', 'h1-tag']) {
    if (ids.includes(id)) applied.push(id)
  }

  return applied
}

// ============================================================
// REDAXO GENERATOREN
// ============================================================

function applyRedaxoRequirements(projectPath, project, siteData, ids) {
  const applied = []
  const domain = project.domain || `${project.name}.rhdemo.de`
  const baseUrl = `https://${domain}`

  // Favicon SVG
  if (ids.includes('favicon')) {
    const primary = siteData.theme?.primary || '#1e40af'
    const initial = (project.name || 'A').charAt(0).toUpperCase()
    const assetsDir = path.join(projectPath, 'assets')
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true })
    fs.writeFileSync(path.join(assetsDir, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="${primary}"/>
  <text x="16" y="23" font-family="system-ui,sans-serif" font-size="20" font-weight="700" fill="white" text-anchor="middle">${initial}</text>
</svg>`, 'utf8')
    applied.push('favicon')
  }

  // manifest.json
  if (ids.includes('manifest')) {
    const manifest = {
      name: siteData.meta?.title || project.name,
      short_name: project.name,
      description: siteData.meta?.description || '',
      start_url: '/',
      display: 'standalone',
      background_color: siteData.theme?.background || '#ffffff',
      theme_color: siteData.theme?.primary || '#1e40af',
    }
    fs.writeFileSync(path.join(projectPath, 'assets', 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
    applied.push('manifest')
  }

  // robots.txt
  if (ids.includes('robots-txt')) {
    fs.writeFileSync(path.join(projectPath, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`, 'utf8')
    applied.push('robots-txt')
  }

  // sitemap.xml (statischer Platzhalter)
  if (ids.includes('sitemap')) {
    fs.writeFileSync(path.join(projectPath, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`, 'utf8')
    applied.push('sitemap')
  }

  // Bereits durch Template abgedeckt
  for (const id of ['html-lang', 'charset', 'viewport', 'title', 'description', 'h1-tag',
                     'apple-touch-icon', 'og-tags', 'canonical', 'impressum', 'datenschutz']) {
    if (ids.includes(id)) applied.push(id)
  }

  return applied
}

// ============================================================
// TYPO3 GENERATOREN
// ============================================================

function applyTypo3Requirements(projectPath, project, siteData, ids) {
  const applied = []
  const domain = project.domain || `${project.name}.rhdemo.de`
  const baseUrl = `https://${domain}`

  // Favicon SVG ins Site Package
  if (ids.includes('favicon')) {
    const primary = siteData.theme?.primary || '#1e40af'
    const initial = (project.name || 'A').charAt(0).toUpperCase()
    const iconsDir = path.join(projectPath, 'packages', 'site_package', 'Resources', 'Public', 'Icons')
    if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true })
    fs.writeFileSync(path.join(iconsDir, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="${primary}"/>
  <text x="16" y="23" font-family="system-ui,sans-serif" font-size="20" font-weight="700" fill="white" text-anchor="middle">${initial}</text>
</svg>`, 'utf8')
    applied.push('favicon')
  }

  // manifest.json
  if (ids.includes('manifest')) {
    const manifest = {
      name: siteData.meta?.title || project.name,
      short_name: project.name,
      description: siteData.meta?.description || '',
      start_url: '/',
      display: 'standalone',
      background_color: siteData.theme?.background || '#ffffff',
      theme_color: siteData.theme?.primary || '#1e40af',
    }
    const publicDir = path.join(projectPath, 'packages', 'site_package', 'Resources', 'Public')
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })
    fs.writeFileSync(path.join(publicDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
    applied.push('manifest')
  }

  // robots.txt
  if (ids.includes('robots-txt')) {
    const webDir = path.join(projectPath, 'public')
    if (!fs.existsSync(webDir)) fs.mkdirSync(webDir, { recursive: true })
    fs.writeFileSync(path.join(webDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`, 'utf8')
    applied.push('robots-txt')
  }

  // Bereits durch TYPO3/Template abgedeckt
  for (const id of ['html-lang', 'charset', 'viewport', 'title', 'description', 'h1-tag',
                     'apple-touch-icon', 'og-tags', 'canonical', 'sitemap', 'impressum', 'datenschutz']) {
    if (ids.includes(id)) applied.push(id)
  }

  return applied
}

// ============================================================
// CONTAO GENERATOREN
// ============================================================

function applyContaoRequirements(projectPath, project, siteData, ids) {
  const applied = []
  const domain = project.domain || `${project.name}.rhdemo.de`
  const baseUrl = `https://${domain}`

  // Favicon SVG
  if (ids.includes('favicon')) {
    const primary = siteData.theme?.primary || '#1e40af'
    const initial = (project.name || 'A').charAt(0).toUpperCase()
    const themeDir = path.join(projectPath, 'files', 'theme')
    if (!fs.existsSync(themeDir)) fs.mkdirSync(themeDir, { recursive: true })
    fs.writeFileSync(path.join(themeDir, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="${primary}"/>
  <text x="16" y="23" font-family="system-ui,sans-serif" font-size="20" font-weight="700" fill="white" text-anchor="middle">${initial}</text>
</svg>`, 'utf8')
    applied.push('favicon')
  }

  // manifest.json
  if (ids.includes('manifest')) {
    const manifest = {
      name: siteData.meta?.title || project.name,
      short_name: project.name,
      description: siteData.meta?.description || '',
      start_url: '/',
      display: 'standalone',
      background_color: siteData.theme?.background || '#ffffff',
      theme_color: siteData.theme?.primary || '#1e40af',
    }
    const themeDir = path.join(projectPath, 'files', 'theme')
    if (!fs.existsSync(themeDir)) fs.mkdirSync(themeDir, { recursive: true })
    fs.writeFileSync(path.join(themeDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
    applied.push('manifest')
  }

  // robots.txt
  if (ids.includes('robots-txt')) {
    const webDir = path.join(projectPath, 'web')
    if (!fs.existsSync(webDir)) fs.mkdirSync(webDir, { recursive: true })
    fs.writeFileSync(path.join(webDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`, 'utf8')
    applied.push('robots-txt')
  }

  // Bereits durch Contao/Template abgedeckt
  for (const id of ['html-lang', 'charset', 'viewport', 'title', 'description', 'h1-tag',
                     'apple-touch-icon', 'og-tags', 'canonical', 'sitemap', 'impressum', 'datenschutz']) {
    if (ids.includes(id)) applied.push(id)
  }

  return applied
}

// ============================================================
// HAUPTFUNKTION
// ============================================================

/**
 * Wendet alle generierbaren Performance-Vorgaben an.
 * Wird nach der AI-Generierung aufgerufen.
 *
 * @param {string} projectPath - Pfad zum Projekt-Verzeichnis
 * @param {object} project - Projekt-Objekt aus der DB
 * @param {object} siteData - AI-generierte Site-Daten (theme, meta, sections)
 * @returns {{ applied: string[] }} - Liste der angewendeten Check-IDs
 */
export function applyRequirements(projectPath, project, siteData) {
  const ids = getGeneratableIds()
  if (ids.length === 0) return { applied: [] }

  const framework = project.framework
  let applied = []

  try {
    if (framework === 'nextjs-starter') {
      applied = applyNextjsRequirements(projectPath, project, siteData, ids)
    } else if (framework === 'wordpress') {
      applied = applyWpRequirements(projectPath, project, siteData, ids)
    } else if (framework === 'redaxo') {
      applied = applyRedaxoRequirements(projectPath, project, siteData, ids)
    } else if (framework === 'typo3') {
      applied = applyTypo3Requirements(projectPath, project, siteData, ids)
    } else if (framework === 'contao') {
      applied = applyContaoRequirements(projectPath, project, siteData, ids)
    }
  } catch (err) {
    console.error(`[REQUIREMENTS] Fehler beim Anwenden: ${err.message}`)
  }

  if (applied.length > 0) {
    console.log(`[REQUIREMENTS] ${applied.length} Vorgaben angewendet: ${applied.join(', ')}`)
  }

  return { applied }
}

export { requirements, getGeneratableIds }
