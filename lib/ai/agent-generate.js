// AI Website-Generierung via Claude Agent SDK
// Der Agent arbeitet autonom: liest Projektstruktur, generiert Sections, baut, fixt Fehler

import { getConfig } from '../config.js'
import { buildDesignBriefSection } from './research.js'

// ============================================================
// SHARED: Agent SDK Runner (von Next.js und WordPress genutzt)
// ============================================================

async function runAgentSDK(prompt, cwd, onOutput) {
  const config = getConfig()
  const apiKey = config.aiApiKey

  if (!apiKey) {
    return { success: false, error: 'AI API Key nicht konfiguriert' }
  }

  if (config.aiProvider !== 'anthropic') {
    return { success: false, error: 'Agent Mode nur mit Anthropic verfuegbar' }
  }

  const model = config.agentModel || 'claude-haiku-4-5'

  if (onOutput) onOutput(`→ Agent Mode: ${model}\n`)
  if (onOutput) onOutput(`→ Arbeitsverzeichnis: ${cwd}\n`)
  console.log(`[Agent] Start: model=${model}, cwd=${cwd}`)

  try {
    const { query } = await import(/* webpackIgnore: true */ '@anthropic-ai/claude-agent-sdk')

    let resultText = ''
    let turnCount = 0
    let writeCount = 0
    let costUsd = 0
    {
    for await (const message of query({
      prompt,
      options: {
        cwd,
        allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
        disallowedTools: ['AskUserQuestion', 'EnterPlanMode', 'ExitPlanMode', 'TodoWrite', 'Agent'],
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        maxTurns: 100,
        model,
        env: { ANTHROPIC_API_KEY: apiKey },
      },
    })) {
      const content = message.message?.content || message.content || []

      if (message.type === 'assistant' && content.length > 0) {
        for (const block of content) {
          if (block.type === 'text' && block.text) {
            const lines = block.text.split('\n').filter(l => l.trim())
            for (const line of lines) {
              if (onOutput) onOutput(`  ${line.slice(0, 200)}\n`)
            }
            resultText = block.text
          } else if (block.type === 'tool_use') {
            turnCount++
            const toolName = block.name || 'tool'
            const input = block.input || {}
            if (toolName === 'Write' || toolName === 'Edit') {
              writeCount++
              if (onOutput) onOutput(`  [${turnCount}] ${toolName}: ${input.file_path || '?'}\n`)
            } else if (toolName === 'Bash') {
              const cmd = (input.command || '').slice(0, 100)
              if (onOutput) onOutput(`  [${turnCount}] Bash: ${cmd}\n`)
            } else if (toolName === 'Read' || toolName === 'Glob' || toolName === 'Grep') {
              if (onOutput) onOutput(`  [${turnCount}] ${toolName}: ${input.file_path || input.pattern || '?'}\n`)
            }
          }
        }
      } else if (message.type === 'system') {
        const info = message.subtype || message.type
        if (onOutput) onOutput(`  [system] ${info}\n`)
      } else if (message.type === 'result') {
        resultText = message.result || resultText
        if (message.total_cost_usd) costUsd = message.total_cost_usd
        const cost = costUsd ? `$${costUsd.toFixed(4)}` : '?'
        const turns = message.num_turns || '?'
        if (onOutput) onOutput(`  [result] ${turns} Turns, Kosten: ${cost}\n`)
        if (resultText && onOutput) onOutput(`  ${(resultText || '').slice(0, 300)}\n`)
      }
    }
    }

    console.log(`[Agent] Fertig: ${turnCount} Tool-Aufrufe, ${writeCount} Dateien geschrieben`)
    if (onOutput) onOutput(`→ Agent fertig: ${turnCount} Tool-Aufrufe, ${writeCount} Dateien geschrieben\n`)

    return { success: true, resultText, turnCount, writeCount, costUsd }
  } catch (err) {
    const errorMsg = err.message || String(err)
    console.error(`[Agent] Fehler:`, errorMsg)
    if (onOutput) onOutput(`→ Agent Fehler: ${errorMsg}\n`)

    if (errorMsg.includes('not found') || errorMsg.includes('ENOENT')) {
      return { success: false, error: 'Claude Code CLI nicht installiert (npm i -g @anthropic-ai/claude-code)' }
    }

    return { success: false, error: `Agent Fehler: ${errorMsg}` }
  }
}

// ============================================================
// NEXT.JS AGENT
// ============================================================

function buildNextjsPrompt(project, designBrief) {
  const briefBlock = buildDesignBriefSection(designBrief)

  return `Du bist ein autonomer Website-Generator. Arbeite SOFORT — keine Fragen, keine Plaene, keine Rueckfragen. Schreibe direkt die Dateien.

PROJEKT:
Name: ${project.name}
Beschreibung: ${project.aiDescription}
${briefBlock}
TECH-STACK:
- Next.js 15 (App Router) mit TypeScript
- SCSS (sass ist installiert) — KEIN Tailwind!
- Schreibe eigenes SCSS mit CSS Custom Properties (--color-primary etc.)
- Path-Alias: @/* zeigt auf Projekt-Root

AUFGABE:
1. Erstelle eine professionelle Website mit 5-8 Sections
2. Definiere ein konsistentes Farbsystem mit CSS Custom Properties in globals.scss (:root { ... })
   Mindestens: --color-primary, --color-secondary, --color-bg, --color-surface, --color-text, --color-text-muted
3. Waehle 1-2 passende Google Fonts (via <link> in layout.tsx head)
4. Erstelle eigene Komponenten — du bist voellig frei in der Struktur
5. Nutze KEINE Client-Komponenten (kein "use client", kein useState/useEffect)
6. Nutze <img> und <a> statt Next.js Image/Link
7. Aendere NICHT: package.json, next.config.js, tsconfig.json

DESIGN-QUALITAET:
- Schreibe REICHES HTML: Wrapper, Container, Dekorations-Elemente, BEM-Klassen (.hero__title)
- Jede Section min. 40 Zeilen SCSS mit Hover-Effekten, Transitions, Gradients
- Nutze CSS Grid/Flexbox, clip-path, backdrop-filter, box-shadow kreativ
- ALLE Farben ueber var(--color-*) — KEINE hardcoded Hex-Werte in Section-Styles!
- Responsive: @media (max-width: 768px) fuer jede Section
- Jede Section eigene .scss Datei, importiert in der Komponente
- Kein generisches Template-Look — erstelle etwas Visuell Einzigartiges!

VALIDIERUNG:
- Fuehre am Ende aus: bunx next build
- Lies Fehlermeldungen genau und fixe sie
- Wiederhole bis der Build erfolgreich ist
- Loesche am Ende: rm -rf .next`
}

export async function generateWithAgent(project, projectPath, designBrief, onOutput) {
  const prompt = buildNextjsPrompt(project, designBrief)
  const result = await runAgentSDK(prompt, projectPath, onOutput)

  if (!result.success) return result

  const { resultText, writeCount, costUsd } = result

  if (writeCount === 0) {
    if (onOutput) onOutput(`→ Agent hat keine Dateien geschrieben — Fallback auf Standard-Modus\n`)
    return { success: false, costUsd, error: 'Agent hat keine Dateien generiert' }
  }

  // Pruefen ob page.tsx vom Platzhalter ueberschrieben wurde
  try {
    const fs = await import('fs')
    const pageContent = fs.readFileSync(`${projectPath}/app/page.tsx`, 'utf8')
    if (pageContent.includes('Next.js Starter') && writeCount < 3) {
      if (onOutput) onOutput(`→ Agent hat page.tsx nicht ueberschrieben — Fallback auf Standard-Modus\n`)
      return { success: false, costUsd, error: 'Agent hat page.tsx nicht ueberschrieben' }
    }
  } catch (e) {
    // Datei nicht lesbar — kein harter Fehler
  }

  return { success: true, costUsd, mode: 'agent', output: resultText }
}

// ============================================================
// WORDPRESS AGENT
// ============================================================

function buildWordPressPrompt(project, themePath, designBrief) {
  const briefBlock = buildDesignBriefSection(designBrief)

  return `Du bist ein autonomer WordPress Block-Theme Generator. Arbeite SOFORT — keine Fragen, keine Plaene, keine Rueckfragen. Schreibe direkt die Dateien.

PROJEKT: ${project.name}
Beschreibung: ${project.aiDescription}
${briefBlock}

BEREITS VORHANDEN (NICHT aendern!):
- functions.php (registriert Blocks aus build/blocks/ automatisch)
- package.json (wp-scripts installiert, node_modules vorhanden)
- templates/ und parts/ (Basis-Templates)

ERSTELLE FOLGENDE DATEIEN:

1. theme.json — Farben, Fonts, Spacing passend zur Beschreibung.
   Definiere CSS Custom Properties via settings.custom (z.B. "primary", "secondary", "bg", "text").

2. style.css — NUR Theme-Header + Google Font @import + minimaler Reset (box-sizing, margin:0).
   KEINE Block-Styles hier! Alle visuellen Styles gehoeren in die Block-SCSS-Dateien.

3. Mindestens 5 Blocks in src/blocks/{name}/:

   Jeder Block braucht 3 Dateien:

   src/blocks/{name}/block.json:
   {"apiVersion":3,"name":"${project.name}/{name}","title":"...","category":"${project.name}","attributes":{...},"editorScript":"file:./index.js","style":"file:./style-index.css"}

   src/blocks/{name}/index.js:
   WICHTIG: Schreibe eine VOLLSTAENDIGE edit-Funktion mit echten Editor-Controls!
   Imports: @wordpress/blocks, @wordpress/block-editor (useBlockProps, InspectorControls, RichText, MediaUpload, MediaUploadCheck), @wordpress/components (PanelBody, TextControl, ColorPalette, Button, RangeControl)
   import './style.scss';

   EDITOR-REGELN:
   - JEDES Attribut muss im Editor bearbeitbar sein (TextControl, RichText, ColorPalette etc.)
   - Fuer Texte: TextControl oder RichText
   - Fuer Farben: ColorPalette in InspectorControls > PanelBody
   - Fuer Bilder: MediaUpload + MediaUploadCheck
   - Fuer Listen/Cards/Items (z.B. Features, Testimonials, Team, Preise):
     Speichere als JSON-String Attribut (type "string", default "[]").
     Im edit: JSON.parse, dann fuer jedes Item Eingabefelder rendern.
     Buttons: "Hinzufuegen" (push neues Item), "Entfernen" (splice), Reihenfolge aendern (move up/down).
     Beispiel-Pattern:
     const items = JSON.parse(attributes.items || '[]');
     const updateItems = (newItems) => setAttributes({ items: JSON.stringify(newItems) });
     const addItem = () => updateItems([...items, { title: '', text: '' }]);
     const removeItem = (i) => updateItems(items.filter((_, idx) => idx !== i));
     const moveItem = (i, dir) => { const arr = [...items]; [arr[i], arr[i+dir]] = [arr[i+dir], arr[i]]; updateItems(arr); };
     const updateItem = (i, key, val) => { const arr = [...items]; arr[i] = {...arr[i], [key]: val}; updateItems(arr); };
   - Die edit-Funktion soll eine LIVE-VORSCHAU des Blocks zeigen (nicht nur "Preview")
   - save: () => null (immer! PHP rendert das Frontend)

   src/blocks/{name}/style.scss:
   .wp-block-${project.name}-{name} { /* ALLE Styles fuer diesen Block hier */ }
   Nutze var(--wp--custom--primary) etc. aus theme.json — KEINE hardcoded Farben!

4. PHP Render-Callback fuer jeden Block:
   includes/render-{name}.php
   KEIN namespace! Nur <?php am Anfang, dann direkt die Funktion.
   Funktionsname: ${project.name}_render_{name}($attributes, $content, $block)
   Schreibe REICHES, visuell ansprechendes HTML mit BEM-Klassen (.block__element).
   Fuer Listen-Attribute: $items = json_decode($attributes['items'] ?? '[]', true);
   Dann foreach ($items as $item) { ... } fuer die Ausgabe.

5. _frontpage.html im Theme-Root mit Block-Markup:
   <!-- wp:${project.name}/hero {"title":"..."} /-->
   <!-- wp:${project.name}/features {} /-->
   usw.
   Fuelle die Attribute mit echten, zum Projekt passenden Texten!

DESIGN-QUALITAET:
- Jeder Block braucht min. 30 Zeilen SCSS mit Hover-Effekten, Transitions, Gradients
- Nutze CSS Grid oder Flexbox fuer Layouts, clip-path oder border-radius fuer Formen
- Schreibe responsive Styles (@media max-width: 768px)
- Konsistentes Farbschema: nutze NUR die Custom Properties aus theme.json
- Render-PHP: Schreibe professionelles HTML mit BEM-artigen Klassennamen (.block__element)
- Kein generisches Bootstrap/Template-Look — erstelle etwas Einzigartiges!

REGELN:
- Block-Names: ${project.name}/{name} (lowercase, kebab-case)
- Alle Blocks dynamisch: save: () => null + PHP Render-Callback
- SCSS: Plain SCSS ohne @use/@import (jeder Block hat eigene Styles)
- Array/Listen-Attribute als JSON-String: type "string", default "[]"
- Funktionsnamen in Render-PHP: ${project.name}_render_{name} (OHNE _block Suffix!)
- KEIN namespace in Render-PHP! Nur <?php und globale Funktion
- Jeder Block muss im Editor VOLL bearbeitbar sein — keine statischen Texte!

VALIDIERUNG:
- Am Ende: bun run build
- Fehler lesen und fixen, wiederholen bis Build OK
- build/ Ordner NICHT loeschen`
}

export async function generateWithAgentWP(project, themePath, designBrief, onOutput) {
  const prompt = buildWordPressPrompt(project, themePath, designBrief)
  const result = await runAgentSDK(prompt, themePath, onOutput)

  if (!result.success) return result

  const { resultText, writeCount, costUsd } = result

  if (writeCount === 0) {
    if (onOutput) onOutput(`→ Agent hat keine Dateien geschrieben — Fallback auf Standard-Modus\n`)
    return { success: false, costUsd, error: 'Agent hat keine Dateien generiert' }
  }

  // Pruefen ob Blocks erstellt wurden (src/blocks/ oder build/blocks/)
  try {
    const fs = await import('fs')
    const srcBlocksDir = `${themePath}/src/blocks`
    const buildBlocksDir = `${themePath}/build/blocks`

    const countDirs = (dir) => {
      if (!fs.existsSync(dir)) return 0
      return fs.readdirSync(dir).filter(d => {
        try { return fs.statSync(`${dir}/${d}`).isDirectory() } catch { return false }
      }).length
    }

    const srcBlocks = countDirs(srcBlocksDir)
    const buildBlocks = countDirs(buildBlocksDir)
    console.log(`[Agent WP] Blocks: ${srcBlocks} in src/blocks/, ${buildBlocks} in build/blocks/, ${writeCount} Dateien geschrieben`)

    if (srcBlocks === 0 && buildBlocks === 0) {
      if (onOutput) onOutput(`→ Agent hat keine Blocks erstellt (${writeCount} Dateien geschrieben)\n`)
      return { success: false, costUsd, error: `Agent hat keine Blocks erstellt (${writeCount} Dateien geschrieben)` }
    }
  } catch (e) {
    console.error(`[Agent WP] Block-Check Fehler:`, e.message)
  }

  return { success: true, costUsd, mode: 'agent', output: resultText }
}
