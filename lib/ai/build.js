import fs from 'fs'
import path from 'path'
import { generateFrontpageHtml } from '../wp-scaffold'
import { generateStyleCSS, generateSetupPhp, generateMainTemplate, BOOT_PHP, phpEsc } from '../redaxo-scaffold'
import { generateSitePackage as generateTypo3SitePackage, generateThemeCSS as generateTypo3CSS, generateContentSQL as generateTypo3SQL } from '../typo3-scaffold/index.js'
import { generateThemeCSS as generateContaoCSS, generateContentSQL as generateContaoSQL, generateMainJs as generateContaoMainJs } from '../contao-scaffold/index.js'
import { VALID_SECTION_TYPES } from '../sections/index.js'
import { getThemeDefaults, getFontConfig, getGoogleFontsUrl } from '../theme-defaults.js'
import { runCommand } from '../run-command'
import { trackFile } from '../deploy-log'
import { parseSiteDataJson } from './parse.js'

// File-Tracking Kontext — wird von ai-generate.js gesetzt
let _trackCtx = null

export function setTrackContext(projectId, basePath) {
  _trackCtx = { projectId, basePath }
}

export function clearTrackContext() {
  _trackCtx = null
}

// Wrapper fuer fs.writeFileSync mit automatischem File-Tracking
function trackedWrite(filePath, content, encoding = 'utf8') {
  fs.writeFileSync(filePath, content, encoding)
  if (_trackCtx) {
    trackFile(_trackCtx.projectId, filePath, _trackCtx.basePath, typeof content === 'string' ? content : '')
  }
}

// Dateien die AI niemals ueberschreiben darf (Projekt-Infrastruktur)
const PROTECTED_FILES = [
  'package.json', 'package-lock.json', 'tsconfig.json', 'next.config.js',
  'next.config.mjs', 'next.config.ts', '.gitignore', 'composer.json',
  'composer.lock', '.env', 'artisan',
]

function isProtectedFile(filePath) {
  const basename = path.basename(filePath)
  if (PROTECTED_FILES.includes(basename)) return true
  // node_modules und .next duerfen nie beschrieben werden
  const normalized = filePath.replace(/\\/g, '/')
  if (normalized.startsWith('node_modules/') || normalized.startsWith('.next/')) return true
  return false
}

// Hex-Farbe zu RGB-Werte konvertieren (fuer CSS-Variablen)
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '37 99 235' // Fallback: Blau
  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
}

// AI-generiertes Markup in sichere Component-Boilerplate wickeln
function assembleComponent(section) {
  const { id, name, markup } = section
  return `import './styles.scss'
import ScrollReveal from '@/components/scroll-reveal/ScrollReveal'

export default function ${name}({ data, id, style: sectionStyle }: any) {
  const cssVars: Record<string, string> = {}
  if (sectionStyle?.background) {
    cssVars['--section-bg'] = sectionStyle.backgroundEnd
      ? \`linear-gradient(135deg, \${sectionStyle.background} 0%, \${sectionStyle.backgroundEnd} 100%)\`
      : sectionStyle.background
  }
  if (sectionStyle?.text) cssVars['--section-text'] = sectionStyle.text
  if (sectionStyle?.textMuted) cssVars['--section-text-muted'] = sectionStyle.textMuted

  return (
    <section id={id} className="section-${id}" style={cssVars}>
      ${markup}
    </section>
  )
}
`
}

// AI-generierte Styles in sichere SCSS-Boilerplate wickeln
function assembleStyles(section) {
  return `@use '../../styles/variables' as *;
@use '../../styles/mixins' as *;
@use '../../styles/animations';

${section.styles}
`
}

// Gemeinsame Theme-Variablen berechnen (fuer globals.scss)
function resolveThemeVars(siteData) {
  const primaryRgb = hexToRgb(siteData.theme.primary)
  const secondaryRgb = hexToRgb(siteData.theme.secondary)
  const mode = siteData.theme.mode || 'light'
  const defaults = getThemeDefaults(mode)
  return {
    primaryRgb,
    secondaryRgb,
    bg: siteData.theme.background || defaults.bg,
    surface: siteData.theme.surface || defaults.surface,
    surfaceAlt: siteData.theme.surfaceAlt || defaults.surfaceAlt,
    text: siteData.theme.text || defaults.text,
    textMuted: siteData.theme.textMuted || defaults.textMuted,
    textInverted: siteData.theme.textInverted || (mode === 'dark' ? '#111827' : '#ffffff'),
    accent: siteData.theme.accent || siteData.theme.primary,
    border: siteData.theme.border || defaults.border,
    fontConfig: getFontConfig(siteData.theme.font),
  }
}

// globals.scss schreiben
function writeGlobalsSCSS(projectPath, vars) {
  const appDir = path.join(projectPath, 'app')
  if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true })
  trackedWrite(path.join(projectPath, 'app/globals.scss'),
`@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-primary: ${vars.primaryRgb};
  --color-secondary: ${vars.secondaryRgb};
  --color-bg: ${vars.bg};
  --color-surface: ${vars.surface};
  --color-surface-alt: ${vars.surfaceAlt};
  --color-text: ${vars.text};
  --color-text-muted: ${vars.textMuted};
  --color-text-inverted: ${vars.textInverted};
  --color-accent: ${vars.accent};
  --color-border: ${vars.border};
  --font-body: ${vars.fontConfig.body};
  --font-heading: ${vars.fontConfig.heading};
}

html { scroll-behavior: smooth; }
*, *::before, *::after { box-sizing: border-box; }

body {
  font-family: var(--font-body);
  margin: 0;
  padding: 0;
  background: var(--color-bg);
  color: var(--color-text);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
}
`)
}

// layout.tsx schreiben
function writeLayout(projectPath, siteData) {
  const googleFontsUrl = getGoogleFontsUrl(siteData.theme.font)
  const fontsLink = googleFontsUrl
    ? `\n        <link rel="preconnect" href="https://fonts.googleapis.com" />\n        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />\n        <link rel="stylesheet" href="${googleFontsUrl}" />`
    : ''

  trackedWrite(path.join(projectPath, 'app/layout.tsx'),
`import './globals.scss'

export const metadata = {
  title: ${JSON.stringify(siteData.meta.title)},
  description: ${JSON.stringify(siteData.meta.description)}
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
`)
}

// Hybrid Site-Data in fertige Next.js Seite umwandeln (AI-generierte Komponenten)
function buildHybridSiteFromJson(siteData, projectPath, projectName) {
  // 1. site-data.json (mit type = id fuer Navbar-Kompatibilitaet)
  const libDir = path.join(projectPath, 'lib')
  if (!fs.existsSync(libDir)) fs.mkdirSync(libDir, { recursive: true })

  const siteDataForJson = { ...siteData }
  siteDataForJson.sections = siteData.sections.map(s => ({ ...s, type: s.id }))
  // Markup/Styles nicht in site-data.json (nur Laufzeit-Daten)
  siteDataForJson.sections = siteDataForJson.sections.map(({ markup, styles, ...rest }) => rest)
  trackedWrite(path.join(libDir, 'site-data.json'), JSON.stringify(siteDataForJson, null, 2), 'utf8')

  // 2. Theme in globals.scss
  const vars = resolveThemeVars(siteData)
  writeGlobalsSCSS(projectPath, vars)

  // 3. Layout mit Meta-Daten + Google Fonts
  writeLayout(projectPath, siteData)

  // 4. Section-Komponenten generieren (Hybrid: AI-Markup in System-Wrapper)
  for (const section of siteData.sections) {
    const blockDir = path.join(projectPath, 'blocks', section.id)
    if (!fs.existsSync(blockDir)) fs.mkdirSync(blockDir, { recursive: true })

    const tsx = assembleComponent(section)
    trackedWrite(path.join(blockDir, `${section.name}.tsx`), tsx, 'utf8')

    const scss = assembleStyles(section)
    trackedWrite(path.join(blockDir, 'styles.scss'), scss, 'utf8')
  }

  // 5. page.tsx generieren
  const imports = siteData.sections
    .map(s => `import ${s.name} from '@/blocks/${s.id}/${s.name}'`)
    .join('\n')

  const sectionJsx = siteData.sections.map((s, i) => {
    const sectionId = s.id === 'contact' ? 'kontakt' : s.id
    const styleProp = s.style ? ` style={siteData.sections[${i}].style}` : ''
    return `      <${s.name} data={siteData.sections[${i}].data} id="${sectionId}"${styleProp} />`
  }).join('\n')

  const navStyle = siteData.theme.navStyle || 'glass'
  const footerStyle = siteData.theme.footerStyle || 'dark'

  trackedWrite(path.join(projectPath, 'app/page.tsx'),
`import Navbar from '@/components/nav/Navbar'
import Footer from '@/components/footer/Footer'
${imports}
import siteData from '@/lib/site-data.json'

export default function Home() {
  return (
    <>
      <Navbar siteName={${JSON.stringify(projectName)}} sections={siteData.sections} navStyle="${navStyle}" />
      <main>
${sectionJsx}
      </main>
      <Footer siteName={${JSON.stringify(projectName)}} sections={siteData.sections} footerStyle="${footerStyle}" />
    </>
  )
}
`)

  return siteData.sections.map(s => s.id)
}

// Build-Validierung fuer Hybrid-Modus (next build vor Git-Commit)
async function validateHybridBuild(projectPath) {
  try {
    const result = await runCommand(`cd ${projectPath} && bunx next build 2>&1`, 120000)
    // .next Verzeichnis aufraumen (wird beim echten Deploy neu gebaut)
    await runCommand(`rm -rf ${projectPath}/.next`)
    return result.success
  } catch {
    return false
  }
}

// Hybrid-Sections auf Registry-Types mappen (Fallback wenn Build fehlschlaegt)
function mapToRegistrySections(siteData) {
  const TYPE_MAP = {
    hero: 'hero', features: 'features', about: 'about', services: 'services',
    stats: 'stats', testimonials: 'testimonials', gallery: 'gallery',
    faq: 'faq', contact: 'contact', cta: 'cta',
    // Heuristische Zuordnung fuer custom Sections
    team: 'about', timeline: 'about', history: 'about', story: 'about',
    pricing: 'services', process: 'features', partners: 'gallery',
    blog: 'gallery', newsletter: 'cta', comparison: 'features',
    roadmap: 'features', 'logo-wall': 'gallery',
  }

  function guessType(section) {
    const d = section.data || {}
    if (d.ctaText && d.title && !d.items) return 'hero'
    if (d.items?.[0]?.icon) return 'features'
    if (d.items?.[0]?.quote) return 'testimonials'
    if (d.items?.[0]?.question) return 'faq'
    if (d.items?.[0]?.value) return 'stats'
    if (d.phone || d.email) return 'contact'
    if (d.highlights) return 'about'
    if (d.items) return 'features'
    if (d.text) return 'about'
    return 'features'
  }

  function convertData(data, registryType) {
    const schemas = {
      hero: ['title', 'subtitle', 'ctaText'],
      features: ['title', 'items'],
      about: ['title', 'text', 'highlights'],
      services: ['title', 'items'],
      stats: ['items'],
      testimonials: ['items'],
      gallery: ['title', 'items'],
      faq: ['title', 'items'],
      contact: ['title', 'phone', 'email', 'address'],
      cta: ['title', 'subtitle', 'ctaText'],
    }
    const allowedFields = schemas[registryType] || Object.keys(data)
    const result = {}
    for (const field of allowedFields) {
      if (data[field] !== undefined) result[field] = data[field]
    }
    if (!result.title && data.title) result.title = data.title
    return result
  }

  const mapped = []
  for (const section of siteData.sections) {
    const registryType = TYPE_MAP[section.id] || guessType(section)
    if (!registryType || !VALID_SECTION_TYPES.includes(registryType)) continue
    mapped.push({
      type: registryType,
      data: convertData(section.data, registryType),
      style: section.style,
    })
  }

  return mapped.length > 0 ? mapped : null
}

// Site-Data JSON in eine fertige Next.js Seite umwandeln (Registry-basiert)
function buildSiteFromJson(siteData, projectPath, projectName) {
  // 1. site-data.json schreiben
  const libDir = path.join(projectPath, 'lib')
  if (!fs.existsSync(libDir)) fs.mkdirSync(libDir, { recursive: true })
  trackedWrite(path.join(libDir, 'site-data.json'), JSON.stringify(siteData, null, 2), 'utf8')

  // 2. Theme in globals.scss
  const vars = resolveThemeVars(siteData)
  writeGlobalsSCSS(projectPath, vars)

  // 3. Layout mit Meta-Daten + Google Fonts
  writeLayout(projectPath, siteData)

  // 4. page.tsx zusammenbauen — importiert nur die Sections die im JSON vorkommen
  const usedTypes = [...new Set(siteData.sections.map(s => s.type))]
  const componentName = (type) => type.charAt(0).toUpperCase() + type.slice(1)

  const imports = usedTypes.map(t => `import ${componentName(t)} from '@/blocks/${t}/${componentName(t)}'`).join('\n')

  const sectionJsx = siteData.sections.map((s, i) => {
    const sectionId = s.type === 'contact' ? 'kontakt' : s.type
    const styleProp = s.style ? ` style={siteData.sections[${i}].style}` : ''
    return `      <${componentName(s.type)} data={siteData.sections[${i}].data} id="${sectionId}"${styleProp} />`
  }).join('\n')

  const navStyle = siteData.theme.navStyle || 'glass'
  const footerStyle = siteData.theme.footerStyle || 'dark'

  trackedWrite(path.join(projectPath, 'app/page.tsx'),
`import Navbar from '@/components/nav/Navbar'
import Footer from '@/components/footer/Footer'
${imports}
import siteData from '@/lib/site-data.json'

export default function Home() {
  return (
    <>
      <Navbar siteName={${JSON.stringify(projectName)}} sections={siteData.sections} navStyle="${navStyle}" />
      <main>
${sectionJsx}
      </main>
      <Footer siteName={${JSON.stringify(projectName)}} sections={siteData.sections} footerStyle="${footerStyle}" />
    </>
  )
}
`)

  return usedTypes
}

// Site-Data JSON in WordPress-Frontpage umwandeln (vorgebaute Blocks)
function buildWordPressSiteFromJson(siteData, themePath, projectName) {
  // _frontpage.html generieren — dynamic blocks mit self-closing comments
  const slug = projectName
  const html = generateFrontpageHtml(slug, siteData.sections)
  if (!fs.existsSync(themePath)) fs.mkdirSync(themePath, { recursive: true })
  trackedWrite(path.join(themePath, '_frontpage.html'), html, 'utf8')

  const usedTypes = [...new Set(siteData.sections.map(s => s.type))]
  return usedTypes
}

// Site-Data JSON in Redaxo-Dateien umwandeln (CSS + setup.php + boot.php)
function buildRedaxoSiteFromJson(siteData, projectPath, projectName) {
  // 1. CSS generieren
  const cssDir = path.join(projectPath, 'assets', 'css')
  if (!fs.existsSync(cssDir)) fs.mkdirSync(cssDir, { recursive: true })
  trackedWrite(path.join(cssDir, 'style.css'), generateStyleCSS(siteData.theme), 'utf8')

  // 2. setup.php generieren (Module + Template + Content-Slices — wird von boot.php getriggert)
  const setupDir = path.join(projectPath, 'redaxo', 'src', 'addons', 'project', 'lib')
  if (!fs.existsSync(setupDir)) fs.mkdirSync(setupDir, { recursive: true })
  trackedWrite(path.join(setupDir, 'setup.php'), generateSetupPhp(siteData, projectName), 'utf8')

  // 3. boot.php schreiben (Auto-Installer — fuehrt setup.php beim ersten Backend-Login aus)
  const bootDir = path.join(projectPath, 'redaxo', 'src', 'addons', 'project')
  trackedWrite(path.join(bootDir, 'boot.php'), BOOT_PHP, 'utf8')

  const usedTypes = [...new Set(siteData.sections.map(s => s.type))]
  return usedTypes
}

// Fehlende Imports fixen (Stub-Dateien erstellen)
function validateAndFixImports(projectPath) {
  const stubs = []
  const allFiles = []

  function walk(dir) {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(tsx?|jsx?)$/.test(entry.name)) allFiles.push(full)
    }
  }
  walk(projectPath)

  const localImportRegex = /(?:import|from)\s+['"]((?:@\/|\.\.?\/)[^'"]+)['"]/g

  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8')
    let match
    while ((match = localImportRegex.exec(content)) !== null) {
      let importPath = match[1]
      let basePath
      if (importPath.startsWith('@/')) {
        basePath = path.join(projectPath, importPath.slice(2))
      } else {
        basePath = path.resolve(path.dirname(file), importPath)
      }
      const extensions = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js']
      const exists = extensions.some(ext => fs.existsSync(basePath + ext)) || fs.existsSync(basePath)
      if (!exists) {
        const stubPath = basePath + '.tsx'
        const componentName = path.basename(importPath)
        const stubContent = `export default function ${componentName}() {\n  return <div>{/* ${componentName} */}</div>\n}\n`
        const dir = path.dirname(stubPath)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        trackedWrite(stubPath, stubContent, 'utf8')
        stubs.push(path.relative(projectPath, stubPath))
      }
    }
  }
  return { stubs }
}

// ============================================================
// WORDPRESS HYBRID
// ============================================================

// HTML-Entities escapen (fuer Pre-Rendering der Frontpage)
function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// AI-JSX-Markup mit konkreten Daten pre-rendern (fuer Frontpage-HTML)
// Muss exakt dem save()-Output entsprechen (WP Block Validation)
function preRenderWpMarkup(markup, data, slug, id) {
  let html = markup

  // className → class
  html = html.replace(/className=/g, 'class=')

  // key={...} Attribute entfernen
  html = html.replace(/\s+key=\{[^}]*\}/g, '')

  // JSX-Kommentare entfernen
  html = html.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

  // Items-Map expandieren (muss vor einfachen Attribut-Ersetzungen kommen)
  const itemsKey = Object.keys(data).find(k => Array.isArray(data[k]))
  if (itemsKey) {
    html = html.replace(
      /\{items\.map\(\(item,?\s*i?\)\s*=>\s*\(([\s\S]*?)\)\)\}/g,
      (_, template) => {
        const items = data[itemsKey]
        return items.map(item => {
          let itemHtml = template
          itemHtml = itemHtml.replace(/\{item\.(\w+)\}/g, (__, field) =>
            escapeHtml(item[field] ?? ''))
          itemHtml = itemHtml.replace(/className=/g, 'class=')
          itemHtml = itemHtml.replace(/\s+key=\{[^}]*\}/g, '')
          return itemHtml
        }).join('\n')
      }
    )
  }

  // Conditionals: {attributes.feld && <...>...</...>}
  html = html.replace(
    /\{attributes\.(\w+)\s*&&\s*(<[\s\S]*?>[\s\S]*?<\/[^>]+>)\}/g,
    (_, field, element) => {
      if (data[field]) {
        let el = element.replace(/className=/g, 'class=')
        el = el.replace(/\{attributes\.(\w+)\}/g, (__, f) =>
          escapeHtml(data[f] ?? ''))
        return el
      }
      return ''
    }
  )

  // Einfache Attribut-Ersetzungen: {attributes.feldName}
  html = html.replace(/\{attributes\.(\w+)\}/g, (_, field) =>
    escapeHtml(data[field] ?? ''))

  // Self-closing JSX Tags normalisieren
  html = html.replace(/<(br|hr|img|input)\s*\/>/g, '<$1>')

  return `<div class="wp-block-${slug}-${id} ${slug}-${id}">\n${html}\n</div>`
}

// WP Block-Dateien fuer eine Hybrid-Section erzeugen
function assembleWpBlock(section, slug) {
  const { id, name, data, markup, styles } = section

  // Attributes aus data ableiten
  const attributes = {}
  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val)) {
      attributes[key] = { type: 'string', default: JSON.stringify(val) }
    } else {
      attributes[key] = { type: 'string', default: String(val ?? '') }
    }
  }

  // block.json
  const blockJson = {
    $schema: 'https://schemas.wp.org/trunk/block.json',
    apiVersion: 3,
    name: `${slug}/${id}`,
    title: name,
    category: slug,
    attributes,
    editorScript: 'file:./index.js',
    editorStyle: 'file:./index.css',
    style: 'file:./style-index.css',
  }

  // Items-Parsing fuer edit-Funktion
  const hasItems = Object.values(data).some(v => Array.isArray(v))
  const itemsKey = Object.keys(data).find(k => Array.isArray(data[k]))
  const itemsParsing = hasItems && itemsKey
    ? `\n    const items = JSON.parse(attributes.${itemsKey} || '[]');`
    : ''

  // index.js — edit zeigt Vorschau, save gibt statisches HTML zurueck
  const indexJs = `import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps } from '@wordpress/block-editor';
import './style.scss';
registerBlockType('${slug}/${id}', {
  edit({ attributes }) {${itemsParsing}
    return (
      <div {...useBlockProps({ className: '${slug}-${id}' })}>
        ${markup}
      </div>
    );
  },
  save({ attributes }) {${itemsParsing}
    return (
      <div {...useBlockProps.save({ className: '${slug}-${id}' })}>
        ${markup}
      </div>
    );
  }
});
`

  // style.scss
  const styleScss = `@use '../../scss/variables' as *;
@use '../../scss/animations';
@use '../../scss/mixins' as *;

${styles}
`

  return { blockJson, indexJs, styleScss }
}

// Hybrid WP Site generieren (AI-generierte Static Blocks + Frontpage)
function buildHybridWpSiteFromJson(siteData, themePath, projectName) {
  const slug = projectName

  // Verzeichnisse sicherstellen
  const srcBlocksDir = path.join(themePath, 'src', 'blocks')
  if (!fs.existsSync(srcBlocksDir)) fs.mkdirSync(srcBlocksDir, { recursive: true })

  // Pro Section: Block-Dateien generieren (kein render-PHP — Static Blocks)
  for (const section of siteData.sections) {
    const block = assembleWpBlock(section, slug)
    const blockDir = path.join(srcBlocksDir, section.id)
    if (!fs.existsSync(blockDir)) fs.mkdirSync(blockDir, { recursive: true })

    trackedWrite(path.join(blockDir, 'block.json'), JSON.stringify(block.blockJson, null, 2) + '\n', 'utf8')
    trackedWrite(path.join(blockDir, 'index.js'), block.indexJs, 'utf8')
    trackedWrite(path.join(blockDir, 'style.scss'), block.styleScss, 'utf8')
    trackedWrite(path.join(blockDir, 'editor.scss'), `@use '../../scss/editor';\n`, 'utf8')
  }

  // Frontpage HTML — Block-Comments mit pre-gerenderten HTML (muss save()-Output matchen)
  const frontpageBlocks = siteData.sections.map(section => {
    const attrs = {}
    for (const [key, val] of Object.entries(section.data || {})) {
      attrs[key] = Array.isArray(val) ? JSON.stringify(val) : String(val ?? '')
    }
    const renderedHtml = preRenderWpMarkup(section.markup, section.data, slug, section.id)
    return `<!-- wp:${slug}/${section.id} ${JSON.stringify(attrs)} -->\n${renderedHtml}\n<!-- /wp:${slug}/${section.id} -->`
  })
  trackedWrite(path.join(themePath, '_frontpage.html'), frontpageBlocks.join('\n\n') + '\n', 'utf8')

  return siteData.sections.map(s => s.id)
}

// ============================================================
// REDAXO HYBRID
// ============================================================

// REX_VALUE-Mapping fuer eine Section berechnen (max 4 Felder)
function computeDataMapping(data) {
  const mapping = {}
  let rexIdx = 1
  for (const [key, val] of Object.entries(data)) {
    if (rexIdx > 4) break
    mapping[key] = { index: rexIdx, isArray: Array.isArray(val) }
    rexIdx++
  }
  return mapping
}

// Redaxo-Modul fuer eine Hybrid-Section erzeugen
function assembleRedaxoModule(section, dataMapping) {
  const { name, output } = section

  // REX_VALUE-Zuweisungen als PHP-Praeambel
  const assignments = []
  for (const [fieldName, info] of Object.entries(dataMapping)) {
    if (info.isArray) {
      assignments.push(`$${fieldName} = json_decode('REX_VALUE[${info.index}]', true) ?: [];`)
    } else {
      assignments.push(`$${fieldName} = 'REX_VALUE[${info.index}]';`)
    }
  }

  const moduleOutput = `<?php\n${assignments.join('\n')}\n?>\n${output}`

  // MForm Input generieren
  const mformFields = []
  const fallbackFields = []
  for (const [fieldName, info] of Object.entries(dataMapping)) {
    const label = fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
    if (info.isArray) {
      mformFields.push(`    ->addTextAreaField(${info.index}.0, ['label' => '${label} (JSON)'])`)
      fallbackFields.push(`  <label>${label} (JSON)</label><textarea class="form-control" name="REX_INPUT_VALUE[${info.index}]">REX_VALUE[${info.index}]</textarea>`)
    } else {
      mformFields.push(`    ->addTextField(${info.index}.0, ['label' => '${label}'])`)
      fallbackFields.push(`  <label>${label}</label><input class="form-control" type="text" name="REX_INPUT_VALUE[${info.index}]" value="REX_VALUE[${info.index}]" />`)
    }
  }

  const moduleInput = `<?php
if (class_exists('FriendsOfRedaxo\\\\MForm')) {
  echo FriendsOfRedaxo\\MForm::factory()
${mformFields.join('\n')}
    ->show();
} else { ?>
<fieldset><legend>${name}</legend>
${fallbackFields.join('\n')}
</fieldset>
<?php } ?>`

  return { input: moduleInput, output: moduleOutput, title: name }
}

// Hybrid Redaxo Site generieren (Custom Module + CSS + setup.php)
function buildHybridRedaxoSiteFromJson(siteData, projectPath, projectName) {
  // 1. CSS: Base-CSS + AI per-Section CSS
  const cssDir = path.join(projectPath, 'assets', 'css')
  if (!fs.existsSync(cssDir)) fs.mkdirSync(cssDir, { recursive: true })

  const baseCss = generateStyleCSS(siteData.theme)
  const sectionCss = siteData.sections.map(s => `\n/* Section: ${s.id} */\n${s.css}`).join('\n')
  trackedWrite(path.join(cssDir, 'style.css'), baseCss + sectionCss, 'utf8')

  // 2. Module generieren + setup.php bauen
  const googleFontsUrl = getGoogleFontsUrl(siteData.theme?.font)
  const template = generateMainTemplate(projectName, googleFontsUrl)

  const moduleBlocks = []
  const usedModuleIds = {}
  let moduleId = 1

  for (const section of siteData.sections) {
    const dataMapping = computeDataMapping(section.data)
    const mod = assembleRedaxoModule(section, dataMapping)
    usedModuleIds[section.id] = moduleId

    moduleBlocks.push(`
// Modul ${moduleId}: ${mod.title}
$input = <<<'MODINPUT'
${mod.input}
MODINPUT;
$output = <<<'MODOUTPUT'
${mod.output}
MODOUTPUT;
$sql->setQuery(
    "REPLACE INTO " . rex::getTable('module') . " (id, name, input, output, createuser, updateuser, createdate, updatedate, revision) VALUES (?, ?, ?, ?, 'admin', 'admin', ?, ?, 0)",
    [${moduleId}, ${phpEsc(mod.title)}, $input, $output, $now, $now]
);`)
    moduleId++
  }

  // Template mit Nowdoc
  const templateBlock = `
// Haupttemplate
$tpl = <<<'TPLCONTENT'
${template}
TPLCONTENT;
$sql->setQuery(
    "REPLACE INTO " . rex::getTable('template') . " (id, name, content, active, createuser, updateuser, createdate, updatedate, revision) VALUES (?, ?, ?, 1, 'admin', 'admin', ?, ?, 0)",
    [1, 'Haupttemplate', $tpl, $now, $now]
);`

  // Content-Slices
  const sliceBlocks = []
  let priority = 1
  for (const section of siteData.sections) {
    const modId = usedModuleIds[section.id]
    if (!modId) continue

    // REX_VALUE-Werte aus section.data berechnen
    const dataMapping = computeDataMapping(section.data)
    const values = {}
    for (const [fieldName, info] of Object.entries(dataMapping)) {
      const val = section.data[fieldName]
      if (info.isArray) {
        // MForm-Repeater: plain Strings zu {text: "..."} konvertieren
        const arr = Array.isArray(val) ? val.map(item => typeof item === 'string' ? { text: item } : item) : []
        values[info.index] = JSON.stringify(arr)
      } else {
        values[info.index] = val || ''
      }
    }

    sliceBlocks.push(`
// Slice: ${section.id}
$sql->setQuery(
    "REPLACE INTO " . rex::getTable('article_slice') . " (id, article_id, clang_id, ctype_id, module_id, priority, revision, status, value1, value2, value3, value4, createuser, updateuser, createdate, updatedate) VALUES (?, 1, 1, 1, ?, ?, 0, 1, ?, ?, ?, ?, 'admin', 'admin', ?, ?)",
    [${priority}, ${modId}, ${priority}, ${phpEsc(values[1] || '')}, ${phpEsc(values[2] || '')}, ${phpEsc(values[3] || '')}, ${phpEsc(values[4] || '')}, $now, $now]
);`)
    priority++
  }

  const setupPhp = `<?php
// Auto-Setup: Hybrid-Module, Template und Startseite
// Wird einmalig nach dem Redaxo-Web-Setup ausgefuehrt

$sql = rex_sql::factory();
$now = date('Y-m-d H:i:s');

// ---- Module ----
${moduleBlocks.join('\n')}

// ---- Template ----
${templateBlock}

// ---- Startseite (Artikel 1) sicherstellen + aktualisieren ----
$existing = $sql->getArray("SELECT id FROM " . rex::getTable('article') . " WHERE id = 1 AND clang_id = 1 LIMIT 1");
if (empty($existing)) {
    $sql->setQuery(
        "INSERT INTO " . rex::getTable('article') . " (id, parent_id, name, catname, catpriority, startarticle, priority, path, status, template_id, clang_id, createdate, revision, createuser, updatedate, updateuser) VALUES (1, 0, 'Startseite', 'Startseite', 1, 1, 1, '|', 1, 1, 1, ?, 0, 'admin', ?, 'admin')",
        [$now, $now]
    );
}
$sql->setQuery("UPDATE " . rex::getTable('article') . " SET template_id = 1, name = 'Startseite', status = 1 WHERE id = 1 AND clang_id = 1");

// Bestehende Slices loeschen
$sql->setQuery("DELETE FROM " . rex::getTable('article_slice') . " WHERE article_id = 1 AND clang_id = 1");

// Content-Slices einfuegen
${sliceBlocks.join('\n')}

// Cache loeschen
rex_article_cache::delete(1);

echo "Setup abgeschlossen: ${siteData.sections.length} Module, 1 Template, ${siteData.sections.length} Sections";
`

  // setup.php + boot.php schreiben
  const setupDir = path.join(projectPath, 'redaxo', 'src', 'addons', 'project', 'lib')
  if (!fs.existsSync(setupDir)) fs.mkdirSync(setupDir, { recursive: true })
  trackedWrite(path.join(setupDir, 'setup.php'), setupPhp, 'utf8')

  const bootDir = path.join(projectPath, 'redaxo', 'src', 'addons', 'project')
  trackedWrite(path.join(bootDir, 'boot.php'), BOOT_PHP, 'utf8')

  return siteData.sections.map(s => s.id)
}

// ============================================================
// TYPO3 HYBRID
// ============================================================

// Hybrid TYPO3 Site generieren (Site Package + HTML Content-Elemente + CSS)
function buildHybridTypo3SiteFromJson(siteData, projectPath, projectName) {
  // 1. CSS: Base + AI per-Section CSS
  const sectionsCss = siteData.sections.map(s => `\n/* Section: ${s.id} */\n${s.css}`).join('\n')
  const fullCSS = generateTypo3CSS(siteData.theme, sectionsCss)

  // 2. Google Fonts URL
  const googleFontsUrl = getGoogleFontsUrl(siteData.theme?.font)

  // 3. Site Package Dateien schreiben
  const pkgDir = path.join(projectPath, 'packages', 'site_package')
  const sitePackageFiles = generateTypo3SitePackage(projectName, fullCSS, googleFontsUrl)
  for (const file of sitePackageFiles) {
    const fullPath = path.join(pkgDir, file.path)
    const dir = path.dirname(fullPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    trackedWrite(fullPath, file.content, 'utf8')
  }

  // 4. SQL-Datei fuer Content-Einfuegung
  const sql = generateTypo3SQL(siteData.sections, projectName)
  trackedWrite(path.join(projectPath, 'setup-content.sql'), sql, 'utf8')

  return siteData.sections.map(s => s.id)
}

// ============================================================
// CONTAO HYBRID
// ============================================================

// Hybrid Contao Site generieren (CSS + HTML Content-Elemente)
function buildHybridContaoSiteFromJson(siteData, projectPath, projectName) {
  // 1. CSS: Base + AI per-Section CSS
  const sectionsCss = siteData.sections.map(s => `\n/* Section: ${s.id} */\n${s.css}`).join('\n')
  const fullCSS = generateContaoCSS(siteData.theme, sectionsCss)

  // 2. CSS + JS schreiben
  const cssDir = path.join(projectPath, 'files', 'theme')
  if (!fs.existsSync(cssDir)) fs.mkdirSync(cssDir, { recursive: true })
  trackedWrite(path.join(cssDir, 'style.css'), fullCSS, 'utf8')
  trackedWrite(path.join(cssDir, 'main.js'), generateContaoMainJs(), 'utf8')

  // 3. .public Datei erstellen (damit Contao den Ordner als oeffentlich erkennt)
  trackedWrite(path.join(projectPath, 'files', 'theme', '.public'), '', 'utf8')

  // 4. Google Fonts URL
  const googleFontsUrl = getGoogleFontsUrl(siteData.theme?.font)

  // 5. SQL-Datei fuer Content-Einfuegung
  const sql = generateContaoSQL(siteData.sections, projectName, googleFontsUrl)
  trackedWrite(path.join(projectPath, 'setup-content.sql'), sql, 'utf8')

  return siteData.sections.map(s => s.id)
}

// Re-exports entfernt — alle Funktionen sind bereits inline exportiert
