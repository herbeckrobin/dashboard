// ============================================================
// SETUP PHP GENERATOR — Erstellt Module + Template + Startseite
// Wird nach Redaxo-Web-Setup automatisch ausgefuehrt
// Nutzt PHP Nowdoc + parametrisierte Queries (kein Escaping noetig)
// ============================================================

import { phpEsc } from './utils.js'
import { REDAXO_MODULES, sectionToValues } from '../sections/index.js'
import { generateMainTemplate } from './template.js'
import { getGoogleFontsUrl } from '../theme-defaults.js'

export function generateSetupPhp(siteData, siteName) {
  const sections = siteData.sections || []
  const googleFontsUrl = getGoogleFontsUrl(siteData.theme?.font)
  const template = generateMainTemplate(siteName, googleFontsUrl)

  // Module mit Nowdoc (HTML/PHP-Inhalte ohne Escaping-Probleme)
  const moduleBlocks = []
  const usedModuleIds = {}
  let moduleId = 1

  for (const [name, mod] of Object.entries(REDAXO_MODULES)) {
    usedModuleIds[name] = moduleId
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

  // Content-Slices mit parametrisierten Queries
  const sliceBlocks = []
  let priority = 1

  for (const section of sections) {
    const modId = usedModuleIds[section.type]
    if (!modId) continue

    const values = sectionToValues(section)

    sliceBlocks.push(`
// Slice: ${section.type}
$sql->setQuery(
    "REPLACE INTO " . rex::getTable('article_slice') . " (id, article_id, clang_id, ctype_id, module_id, priority, revision, status, value1, value2, value3, value4, createuser, updateuser, createdate, updatedate) VALUES (?, 1, 1, 1, ?, ?, 0, 1, ?, ?, ?, ?, 'admin', 'admin', ?, ?)",
    [${priority}, ${modId}, ${priority}, ${phpEsc(values[1] || '')}, ${phpEsc(values[2] || '')}, ${phpEsc(values[3] || '')}, ${phpEsc(values[4] || '')}, $now, $now]
);`)
    priority++
  }

  return `<?php
// Auto-Setup: Module, Template und Startseite
// Wird einmalig nach dem Redaxo-Web-Setup ausgefuehrt

$sql = rex_sql::factory();
$now = date('Y-m-d H:i:s');

// ---- Module ----
${moduleBlocks.join('\n')}

// ---- Template ----
${templateBlock}

// ---- Startseite (Artikel 1) sicherstellen + aktualisieren ----
// Falls Artikel 1 nicht existiert, anlegen (Safety-Net)
$existing = $sql->getArray("SELECT id FROM " . rex::getTable('article') . " WHERE id = 1 AND clang_id = 1 LIMIT 1");
if (empty($existing)) {
    $sql->setQuery(
        "INSERT INTO " . rex::getTable('article') . " (id, parent_id, name, catname, catpriority, startarticle, priority, path, status, template_id, clang_id, createdate, revision, createuser, updatedate, updateuser) VALUES (1, 0, 'Startseite', 'Startseite', 1, 1, 1, '|', 1, 1, 1, ?, 0, 'admin', ?, 'admin')",
        [$now, $now]
    );
}
// Template zuweisen + online setzen
$sql->setQuery("UPDATE " . rex::getTable('article') . " SET template_id = 1, name = 'Startseite', status = 1 WHERE id = 1 AND clang_id = 1");

// Bestehende Slices loeschen
$sql->setQuery("DELETE FROM " . rex::getTable('article_slice') . " WHERE article_id = 1 AND clang_id = 1");

// Content-Slices einfuegen
${sliceBlocks.join('\n')}

// Cache loeschen
rex_article_cache::delete(1);

echo "Setup abgeschlossen: ${Object.keys(usedModuleIds).length} Module, 1 Template, ${sections.length} Sections";
`
}
