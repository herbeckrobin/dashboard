import path from 'path'
import { VALID_SECTION_TYPES } from '../sections/index.js'
import { VALID_FONT_KEYS } from '../theme-defaults.js'

// Verbotene Patterns aus AI-generiertem JSX entfernen
function sanitizeJsx(markup) {
  let clean = markup
  // import/require Statements entfernen
  clean = clean.replace(/import\s+.*?from\s+['"][^'"]+['"]\s*;?\n?/g, '')
  clean = clean.replace(/import\s+['"][^'"]+['"]\s*;?\n?/g, '')
  clean = clean.replace(/(?:const|let|var)\s+.*?=\s*require\s*\(.*?\)\s*;?\n?/g, '')
  // React Hooks entfernen (Aufruf + Zuweisung)
  clean = clean.replace(/(?:const|let|var)\s+.*?=\s*(?:useState|useEffect|useRef|useCallback|useMemo|useContext|useReducer|useRouter|usePathname)\s*\([\s\S]*?\)\s*;?\n?/g, '')
  clean = clean.replace(/\b(?:useEffect|useCallback|useMemo)\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*(?:,\s*\[[\s\S]*?\])?\s*\)\s*;?\n?/g, '')
  // Event-Handler Attribute entfernen (onClick, onChange, onSubmit, etc.)
  clean = clean.replace(/\bon[A-Z][a-zA-Z]*=\{[^}]*\}/g, '')
  // dangerouslySetInnerHTML entfernen
  clean = clean.replace(/dangerouslySetInnerHTML=\{[^}]*\}/g, '')
  // Next.js Image/Link Komponenten durch HTML ersetzen
  clean = clean.replace(/<Image\s/g, '<img ')
  clean = clean.replace(/<Link\s/g, '<a ')
  clean = clean.replace(/<\/Link>/g, '</a>')
  return clean
}

// AI-Antwort als Datei-Array parsen (fuer Laravel, Express etc.)
function parseAiFiles(responseText) {
  let jsonStr = responseText.trim()

  // Markdown-Codeblocks extrahieren (mehrere Strategien)
  if (jsonStr.startsWith('```')) {
    // Oeffnenden Fence entfernen (```json, ```JSON, ```, etc.)
    jsonStr = jsonStr.replace(/^```\w*\s*\n?/, '')
    // Schliessenden Fence entfernen
    jsonStr = jsonStr.replace(/\n?\s*```\s*$/, '')
    jsonStr = jsonStr.trim()
  } else {
    const codeBlockMatch = jsonStr.match(/```(?:json|JSON)?\s*\n([\s\S]*?)\n\s*```/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim()
    }
  }

  // Fallback: JSON-Array direkt im Text finden
  if (!jsonStr.startsWith('[')) {
    const arrayMatch = jsonStr.match(/\[\s*\{[\s\S]*\}\s*\]/)
    if (arrayMatch) {
      jsonStr = arrayMatch[0]
    }
  }

  let files
  try {
    files = JSON.parse(jsonStr)
  } catch (parseErr) {
    // Abgeschnittenes JSON reparieren: alle vollstaendigen Objekte extrahieren
    const repaired = []
    const objRegex = /\{\s*"path"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/g
    let match
    while ((match = objRegex.exec(jsonStr)) !== null) {
      repaired.push({ path: match[1], content: match[2].replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\') })
    }
    if (repaired.length === 0) throw parseErr
    files = repaired
  }

  if (!Array.isArray(files)) {
    throw new Error('AI-Antwort ist kein JSON-Array')
  }

  const validated = []
  for (const file of files) {
    if (!file.path || typeof file.path !== 'string') continue
    if (!file.content || typeof file.content !== 'string') continue

    const normalized = path.normalize(file.path)
    if (normalized.startsWith('..') || normalized.startsWith('/')) continue
    if (normalized.includes('..')) continue

    validated.push({ path: normalized, content: file.content })
  }

  if (validated.length === 0) {
    throw new Error('Keine validen Dateien in AI-Antwort')
  }

  return validated
}

// AI-Antwort als Site-Data JSON parsen (fuer WordPress, Redaxo, Next.js Registry)
function parseSiteDataJson(responseText) {
  let jsonStr = responseText.trim()

  // Markdown-Codeblocks entfernen
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```\w*\s*\n?/, '').replace(/\n?\s*```\s*$/, '').trim()
  } else {
    const match = jsonStr.match(/```(?:json|JSON)?\s*\n([\s\S]*?)\n\s*```/)
    if (match) jsonStr = match[1].trim()
  }

  // JSON-Objekt im Text finden
  if (!jsonStr.startsWith('{')) {
    const objMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (objMatch) jsonStr = objMatch[0]
  }

  const data = JSON.parse(jsonStr)
  if (!data || typeof data !== 'object') throw new Error('AI-Antwort ist kein JSON-Objekt')
  if (!Array.isArray(data.sections) || data.sections.length === 0) throw new Error('Keine Sections in AI-Antwort')

  // Sections validieren: nur bekannte Types behalten
  data.sections = data.sections.filter(s => s && s.type && VALID_SECTION_TYPES.includes(s.type) && s.data)

  if (data.sections.length === 0) throw new Error('Keine validen Sections in AI-Antwort')

  // Theme Defaults
  if (!data.theme) data.theme = {}
  if (!data.theme.primary) data.theme.primary = '#2563eb'
  if (!data.theme.secondary) data.theme.secondary = '#7c3aed'

  // Neue Theme-Properties validieren
  const validModes = ['light', 'dark']
  if (data.theme.mode && !validModes.includes(data.theme.mode)) data.theme.mode = 'light'

  if (data.theme.font && !VALID_FONT_KEYS.includes(data.theme.font)) delete data.theme.font

  const validNavStyles = ['glass', 'solid', 'minimal', 'transparent']
  if (data.theme.navStyle && !validNavStyles.includes(data.theme.navStyle)) delete data.theme.navStyle

  const validFooterStyles = ['dark', 'minimal', 'accent']
  if (data.theme.footerStyle && !validFooterStyles.includes(data.theme.footerStyle)) delete data.theme.footerStyle

  // Hex-Farben validieren (ungueltige Werte entfernen)
  const hexRegex = /^#[0-9a-fA-F]{3,8}$/
  const colorProps = ['background', 'surface', 'surfaceAlt', 'text', 'textMuted', 'textInverted', 'accent', 'border']
  for (const prop of colorProps) {
    if (data.theme[prop] && !hexRegex.test(data.theme[prop])) delete data.theme[prop]
  }

  // Per-Section Styles validieren
  for (const section of data.sections) {
    if (section.style) {
      for (const prop of ['background', 'backgroundEnd', 'text', 'textMuted']) {
        if (section.style[prop] && !hexRegex.test(section.style[prop]) && !section.style[prop].startsWith('rgba')) {
          delete section.style[prop]
        }
      }
    }
  }

  // Meta Defaults
  if (!data.meta) data.meta = {}
  if (!data.meta.title) data.meta.title = 'Webseite'
  if (!data.meta.description) data.meta.description = ''

  return data
}

// Hybrid AI-Antwort parsen (Markup + Styles pro Section)
function parseHybridSiteData(responseText) {
  let jsonStr = responseText.trim()

  // Markdown-Codeblocks entfernen (gleiche Logik wie parseSiteDataJson)
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```\w*\s*\n?/, '').replace(/\n?\s*```\s*$/, '').trim()
  } else {
    const match = jsonStr.match(/```(?:json|JSON)?\s*\n([\s\S]*?)\n\s*```/)
    if (match) jsonStr = match[1].trim()
  }
  if (!jsonStr.startsWith('{')) {
    const objMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (objMatch) jsonStr = objMatch[0]
  }

  const data = JSON.parse(jsonStr)
  if (!data || typeof data !== 'object') throw new Error('AI-Antwort ist kein JSON-Objekt')
  if (!Array.isArray(data.sections) || data.sections.length === 0) throw new Error('Keine Sections in AI-Antwort')

  // Pruefen ob Hybrid-Format (mindestens eine Section hat markup + styles)
  const hasHybridSections = data.sections.some(s => s.markup && s.styles)
  if (!hasHybridSections) {
    // Kein Hybrid-Format → Fallback auf altes Registry-System
    return { hybrid: false, data: parseSiteDataJson(responseText) }
  }

  // Sections validieren
  const validSections = []
  for (const section of data.sections) {
    if (!section.id || !section.name || !section.data || !section.markup || !section.styles) {
      continue
    }
    // id normalisieren: nur lowercase, Bindestriche, Buchstaben/Zahlen
    section.id = section.id.toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!section.id) continue

    // name muss PascalCase sein
    if (!/^[A-Z][a-zA-Z0-9]+$/.test(section.name)) {
      section.name = section.id
        .split('-')
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join('') + 'Section'
    }

    // Markup sanitizen
    section.markup = sanitizeJsx(section.markup)

    validSections.push(section)
  }

  if (validSections.length === 0) {
    return { hybrid: false, data: parseSiteDataJson(responseText) }
  }

  data.sections = validSections

  // Theme validieren (gleiche Logik wie parseSiteDataJson)
  if (!data.theme) data.theme = {}
  if (!data.theme.primary) data.theme.primary = '#2563eb'
  if (!data.theme.secondary) data.theme.secondary = '#7c3aed'

  const validModes = ['light', 'dark']
  if (data.theme.mode && !validModes.includes(data.theme.mode)) data.theme.mode = 'light'
  if (data.theme.font && !VALID_FONT_KEYS.includes(data.theme.font)) delete data.theme.font

  const validNavStyles = ['glass', 'solid', 'minimal', 'transparent']
  if (data.theme.navStyle && !validNavStyles.includes(data.theme.navStyle)) delete data.theme.navStyle
  const validFooterStyles = ['dark', 'minimal', 'accent']
  if (data.theme.footerStyle && !validFooterStyles.includes(data.theme.footerStyle)) delete data.theme.footerStyle

  // Hex-Farben validieren
  const hexRegex = /^#[0-9a-fA-F]{3,8}$/
  const colorProps = ['background', 'surface', 'surfaceAlt', 'text', 'textMuted', 'textInverted', 'accent', 'border']
  for (const prop of colorProps) {
    if (data.theme[prop] && !hexRegex.test(data.theme[prop])) delete data.theme[prop]
  }

  // Per-Section Styles validieren
  for (const section of data.sections) {
    if (section.style) {
      for (const prop of ['background', 'backgroundEnd', 'text', 'textMuted']) {
        if (section.style[prop] && !hexRegex.test(section.style[prop]) && !section.style[prop].startsWith('rgba')) {
          delete section.style[prop]
        }
      }
    }
  }

  // Meta Defaults
  if (!data.meta) data.meta = {}
  if (!data.meta.title) data.meta.title = 'Webseite'
  if (!data.meta.description) data.meta.description = ''

  return { hybrid: true, data }
}

// Gefaehrliche PHP-Patterns aus AI-generiertem Output entfernen
function sanitizePhp(output) {
  let clean = output
  // include/require Statements entfernen
  clean = clean.replace(/\b(?:include|require|include_once|require_once)\s*[\('"]/g, '/* REMOVED */')
  // Gefaehrliche Funktionen entfernen
  clean = clean.replace(/\b(?:eval|exec|system|shell_exec|passthru|popen|proc_open)\s*\(/g, '/* REMOVED */(')
  // Datei-Operationen entfernen
  clean = clean.replace(/\b(?:file_get_contents|file_put_contents|fopen|fwrite|fread|unlink|rmdir|mkdir|copy|rename|chmod|chown)\s*\(/g, '/* REMOVED */(')
  // Backtick-Operator entfernen
  clean = clean.replace(/`[^`]*`/g, "''")
  // Superglobals entfernen
  clean = clean.replace(/\$_(?:GET|POST|REQUEST|SERVER|SESSION|COOKIE|FILES|ENV)\b/g, "''")
  // header/setcookie entfernen
  clean = clean.replace(/\b(?:header|setcookie)\s*\(/g, '/* REMOVED */(')
  // preg_replace mit /e Modifier entfernen
  clean = clean.replace(/preg_replace\s*\(\s*['"][^'"]*\/e['"]/g, "/* REMOVED */('//")
  return clean
}

// Hybrid AI-Antwort fuer Redaxo parsen (PHP/HTML Output + CSS pro Section)
function parseHybridRedaxoData(responseText) {
  let jsonStr = responseText.trim()

  // Markdown-Codeblocks entfernen
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```\w*\s*\n?/, '').replace(/\n?\s*```\s*$/, '').trim()
  } else {
    const match = jsonStr.match(/```(?:json|JSON)?\s*\n([\s\S]*?)\n\s*```/)
    if (match) jsonStr = match[1].trim()
  }
  if (!jsonStr.startsWith('{')) {
    const objMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (objMatch) jsonStr = objMatch[0]
  }

  const data = JSON.parse(jsonStr)
  if (!data || typeof data !== 'object') throw new Error('AI-Antwort ist kein JSON-Objekt')
  if (!Array.isArray(data.sections) || data.sections.length === 0) throw new Error('Keine Sections in AI-Antwort')

  // Pruefen ob Hybrid-Format (mindestens eine Section hat output + css)
  const hasHybridSections = data.sections.some(s => s.output && s.css)
  if (!hasHybridSections) {
    return { hybrid: false, data: parseSiteDataJson(responseText) }
  }

  // Sections validieren
  const validSections = []
  for (const section of data.sections) {
    if (!section.id || !section.name || !section.data || !section.output || !section.css) {
      continue
    }
    // id normalisieren
    section.id = section.id.toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!section.id) continue

    // Output sanitizen
    section.output = sanitizePhp(section.output)

    validSections.push(section)
  }

  if (validSections.length === 0) {
    return { hybrid: false, data: parseSiteDataJson(responseText) }
  }

  data.sections = validSections

  // Theme validieren
  if (!data.theme) data.theme = {}
  if (!data.theme.primary) data.theme.primary = '#2563eb'
  if (!data.theme.secondary) data.theme.secondary = '#7c3aed'

  const validModes = ['light', 'dark']
  if (data.theme.mode && !validModes.includes(data.theme.mode)) data.theme.mode = 'light'
  if (data.theme.font && !VALID_FONT_KEYS.includes(data.theme.font)) delete data.theme.font

  // Hex-Farben validieren
  const hexRegex = /^#[0-9a-fA-F]{3,8}$/
  const colorProps = ['background', 'surface', 'surfaceAlt', 'text', 'textMuted', 'textInverted', 'accent', 'border']
  for (const prop of colorProps) {
    if (data.theme[prop] && !hexRegex.test(data.theme[prop])) delete data.theme[prop]
  }

  // Meta Defaults
  if (!data.meta) data.meta = {}
  if (!data.meta.title) data.meta.title = 'Webseite'
  if (!data.meta.description) data.meta.description = ''

  return { hybrid: true, data }
}

// HTML-Output sanitizen (fuer TYPO3/Contao — kein PHP erlaubt)
function sanitizeHtml(output) {
  let clean = output
  // PHP-Code entfernen
  clean = clean.replace(/<\?(?:php|=)[\s\S]*?\?>/g, '')
  // Script-Tags entfernen
  clean = clean.replace(/<script\b[\s\S]*?<\/script>/gi, '')
  // Event-Handler entfernen (onclick, onerror, onload, etc.)
  clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
  // iframe, object, embed entfernen
  clean = clean.replace(/<(?:iframe|object|embed)\b[\s\S]*?(?:\/>|<\/(?:iframe|object|embed)>)/gi, '')
  // form, input, textarea entfernen (ausser dekorative Links)
  clean = clean.replace(/<(?:form|input|textarea|select)\b[\s\S]*?(?:\/>|<\/(?:form|input|textarea|select)>)/gi, '')
  return clean
}

// Hybrid AI-Antwort fuer TYPO3/Contao parsen (HTML Output + CSS pro Section)
function parseHybridCmsData(responseText) {
  let jsonStr = responseText.trim()

  // Markdown-Codeblocks entfernen
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```\w*\s*\n?/, '').replace(/\n?\s*```\s*$/, '').trim()
  } else {
    const match = jsonStr.match(/```(?:json|JSON)?\s*\n([\s\S]*?)\n\s*```/)
    if (match) jsonStr = match[1].trim()
  }
  if (!jsonStr.startsWith('{')) {
    const objMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (objMatch) jsonStr = objMatch[0]
  }

  const data = JSON.parse(jsonStr)
  if (!data || typeof data !== 'object') throw new Error('AI-Antwort ist kein JSON-Objekt')
  if (!Array.isArray(data.sections) || data.sections.length === 0) throw new Error('Keine Sections in AI-Antwort')

  // Pruefen ob Hybrid-Format (mindestens eine Section hat output + css)
  const hasHybridSections = data.sections.some(s => s.output && s.css)
  if (!hasHybridSections) {
    return { hybrid: false, data: parseSiteDataJson(responseText) }
  }

  // Sections validieren
  const validSections = []
  for (const section of data.sections) {
    if (!section.id || !section.name || !section.output || !section.css) {
      continue
    }
    // id normalisieren
    section.id = section.id.toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!section.id) continue

    // Output sanitizen (HTML, kein PHP)
    section.output = sanitizeHtml(section.output)

    validSections.push(section)
  }

  if (validSections.length === 0) {
    return { hybrid: false, data: parseSiteDataJson(responseText) }
  }

  data.sections = validSections

  // Theme validieren
  if (!data.theme) data.theme = {}
  if (!data.theme.primary) data.theme.primary = '#2563eb'
  if (!data.theme.secondary) data.theme.secondary = '#7c3aed'

  const validModes = ['light', 'dark']
  if (data.theme.mode && !validModes.includes(data.theme.mode)) data.theme.mode = 'light'
  if (data.theme.font && !VALID_FONT_KEYS.includes(data.theme.font)) delete data.theme.font

  // Hex-Farben validieren
  const hexRegex = /^#[0-9a-fA-F]{3,8}$/
  const colorProps = ['background', 'surface', 'surfaceAlt', 'text', 'textMuted', 'textInverted', 'accent', 'border']
  for (const prop of colorProps) {
    if (data.theme[prop] && !hexRegex.test(data.theme[prop])) delete data.theme[prop]
  }

  // Meta Defaults
  if (!data.meta) data.meta = {}
  if (!data.meta.title) data.meta.title = 'Webseite'
  if (!data.meta.description) data.meta.description = ''

  return { hybrid: true, data }
}

export { sanitizeJsx, sanitizePhp, sanitizeHtml, parseAiFiles, parseSiteDataJson, parseHybridSiteData, parseHybridRedaxoData, parseHybridCmsData }
