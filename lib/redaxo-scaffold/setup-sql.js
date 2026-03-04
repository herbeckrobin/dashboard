// ============================================================
// SETUP SQL GENERATOR — Reines SQL fuer direkte Ausfuehrung via mysql CLI
// Wird nach setup:run ausgefuehrt (DB-Tabellen muessen existieren)
// ============================================================

import { sqlEsc } from './utils.js'
import { REDAXO_MODULES, sectionToValues } from '../sections/index.js'
import { generateMainTemplate } from './template.js'

export function generateSetupSql(siteData, siteName) {
  const sections = siteData.sections || []
  const template = generateMainTemplate(siteName)
  const lines = ['-- Auto-Setup: Module, Template und Startseite', '-- Generiert vom Deploy Dashboard', '']

  // Module
  let moduleId = 1
  const usedModuleIds = {}

  for (const [name, mod] of Object.entries(REDAXO_MODULES)) {
    usedModuleIds[name] = moduleId
    lines.push(`REPLACE INTO rex_module (id, name, input, output, createuser, updateuser, createdate, updatedate, revision) VALUES (${moduleId}, ${sqlEsc(mod.title)}, ${sqlEsc(mod.input)}, ${sqlEsc(mod.output)}, 'admin', 'admin', NOW(), NOW(), 0);`)
    moduleId++
  }

  // Template
  lines.push('')
  lines.push(`REPLACE INTO rex_template (id, name, content, active, createuser, updateuser, createdate, updatedate, revision) VALUES (1, ${sqlEsc('Haupttemplate')}, ${sqlEsc(template)}, 1, 'admin', 'admin', NOW(), NOW(), 0);`)

  // Artikel 1 sicherstellen + aktualisieren (Safety-Net)
  lines.push('')
  lines.push(`INSERT IGNORE INTO rex_article (id, parent_id, name, catname, catpriority, startarticle, priority, path, status, template_id, clang_id, createdate, revision, createuser, updatedate, updateuser) VALUES (1, 0, 'Startseite', 'Startseite', 1, 1, 1, '|', 1, 1, 1, NOW(), 0, 'admin', NOW(), 'admin');`)
  lines.push(`UPDATE rex_article SET template_id = 1, name = 'Startseite', status = 1 WHERE id = 1 AND clang_id = 1;`)

  // Bestehende Slices loeschen
  lines.push(`DELETE FROM rex_article_slice WHERE article_id = 1 AND clang_id = 1;`)

  // Content-Slices einfuegen
  let priority = 1
  for (const section of sections) {
    const modId = usedModuleIds[section.type]
    if (!modId) continue

    const values = sectionToValues(section)

    lines.push(`INSERT INTO rex_article_slice (id, article_id, clang_id, ctype_id, module_id, priority, revision, status, value1, value2, value3, value4, createuser, updateuser, createdate, updatedate) VALUES (${priority}, 1, 1, 1, ${modId}, ${priority}, 0, 1, ${sqlEsc(values[1] || '')}, ${sqlEsc(values[2] || '')}, ${sqlEsc(values[3] || '')}, ${sqlEsc(values[4] || '')}, 'admin', 'admin', NOW(), NOW());`)
    priority++
  }

  // Hinweis: Redaxo nutzt dateibasiertes Caching (redaxo/cache/)
  // Bei frischer Installation existiert kein Cache, der geleert werden muesste

  return lines.join('\n')
}
