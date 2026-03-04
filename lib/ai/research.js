// Design-Recherche Agent
// Recherchiert aktuelle Webdesign-Trends fuer die jeweilige Branche/Beschreibung
// Nutzt WebSearch + WebFetch um echte Websites zu analysieren

import { getConfig } from '../config.js'

function buildResearchPrompt(aiDescription) {
  return `Du bist ein Design-Researcher. Deine Aufgabe: Recherchiere aktuelle Webdesign-Trends fuer folgende Website:

"${aiDescription}"

VORGEHEN:
1. Identifiziere die Branche/Nische aus der Beschreibung
2. Nutze WebSearch um 3-5 fuehrende, gut gestaltete Websites in dieser Branche zu finden
3. Nutze WebFetch um 2-3 der besten Treffer zu analysieren — achte auf:
   - Farbpalette und Stimmung
   - Layout-Patterns (Hero-Gestaltung, Section-Uebergaenge, Grid-Varianten)
   - Typografie (Schriftpaarungen, Groessen, Gewichtungen)
   - Visuelle Techniken (Animationen, Hover-Effekte, Parallax, Glassmorphism etc.)
   - Besondere CSS-Techniken (clip-path, backdrop-filter, Gradients etc.)

WICHTIG:
- Suche nach ECHTEN Websites, nicht nach Blog-Artikeln ueber Trends
- Analysiere was diese Websites KONKRET gut machen
- Extrahiere umsetzbare Design-Ideen, keine generischen Tipps

Antworte am Ende NUR mit einem JSON-Objekt (KEIN Markdown, KEINE Codeblocks):
{
  "colorMood": "Konkrete Farbbeschreibung, z.B. 'warme Erdtoene mit Terrakotta-Akzenten und cremigem Weiss'",
  "layoutPatterns": ["konkretes Pattern 1", "konkretes Pattern 2", "..."],
  "typographyStyle": "z.B. 'Serif-Headings fuer Authoritaet, geometrische Sans-Serif Body'",
  "visualTechniques": ["konkrete Technik 1", "konkrete Technik 2", "..."],
  "cssPatterns": ["konkretes CSS-Pattern 1", "..."],
  "moodKeywords": ["keyword1", "keyword2", "..."]
}`
}

// Research-Brief aus Agent-Antwort parsen
function parseDesignBrief(resultText) {
  if (!resultText) return null

  try {
    // JSON direkt oder aus Text extrahieren
    const jsonMatch = resultText.match(/\{[\s\S]*"colorMood"[\s\S]*\}/)
    if (!jsonMatch) return null

    const brief = JSON.parse(jsonMatch[0])

    // Minimale Validierung
    if (!brief.colorMood || !brief.layoutPatterns) return null

    return brief
  } catch {
    return null
  }
}

export async function runDesignResearch(aiDescription, onOutput) {
  const config = getConfig()
  const apiKey = config.aiApiKey

  if (!apiKey || config.aiProvider !== 'anthropic') {
    return null
  }

  if (onOutput) onOutput('→ Design-Recherche gestartet...\n')
  console.log('[Research] Start fuer:', aiDescription.substring(0, 80))

  try {
    const { query } = await import(/* webpackIgnore: true */ '@anthropic-ai/claude-agent-sdk')

    const model = config.agentModel || 'claude-haiku-4-5'
    let resultText = ''
    let turnCount = 0
    let costUsd = 0

    for await (const message of query({
      prompt: buildResearchPrompt(aiDescription),
      options: {
        cwd: '/tmp',
        allowedTools: ['WebSearch', 'WebFetch', 'Bash'],
        disallowedTools: ['AskUserQuestion', 'EnterPlanMode', 'ExitPlanMode', 'TodoWrite', 'Agent', 'Write', 'Edit', 'Read'],
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        maxTurns: 20,
        model,
        env: { ANTHROPIC_API_KEY: apiKey },
      },
    })) {
      const content = message.message?.content || message.content || []

      if (message.type === 'assistant' && content.length > 0) {
        for (const block of content) {
          if (block.type === 'text' && block.text) {
            resultText = block.text
          } else if (block.type === 'tool_use') {
            turnCount++
            const toolName = block.name || 'tool'
            if (toolName === 'WebSearch') {
              if (onOutput) onOutput(`  [Recherche] WebSearch: ${(block.input?.query || '').slice(0, 80)}\n`)
            } else if (toolName === 'WebFetch') {
              if (onOutput) onOutput(`  [Recherche] WebFetch: ${(block.input?.url || '').slice(0, 80)}\n`)
            }
          }
        }
      } else if (message.type === 'result') {
        resultText = message.result || resultText
        if (message.total_cost_usd) costUsd = message.total_cost_usd
        const cost = costUsd ? `$${costUsd.toFixed(4)}` : '?'
        if (onOutput) onOutput(`  [Recherche] Fertig: ${turnCount} Aufrufe, Kosten: ${cost}\n`)
      }
    }

    const brief = parseDesignBrief(resultText)
    if (brief) {
      console.log('[Research] Erfolgreich:', brief.colorMood)
      if (onOutput) onOutput(`→ Design-Brief: ${brief.colorMood}\n`)
      return { ...brief, costUsd }
    }

    console.log('[Research] Kein valides JSON zurueckbekommen')
    if (onOutput) onOutput('→ Design-Recherche: kein verwertbares Ergebnis\n')
    return null
  } catch (err) {
    console.error('[Research] Fehler:', err.message)
    if (onOutput) onOutput(`→ Design-Recherche fehlgeschlagen: ${err.message}\n`)
    return null
  }
}

// Design-Brief als Prompt-Block formatieren (fuer Injection in Generation-Prompts)
export function buildDesignBriefSection(designBrief) {
  if (!designBrief) return ''
  return `
DESIGN-RECHERCHE (nutze diese Ideen fuer ein einzigartiges Design!):
- Farbstimmung: ${designBrief.colorMood || 'nicht verfuegbar'}
- Layout-Patterns: ${(designBrief.layoutPatterns || []).join(', ') || 'keine'}
- Typografie: ${designBrief.typographyStyle || 'nicht verfuegbar'}
- Visuelle Techniken: ${(designBrief.visualTechniques || []).join(', ') || 'keine'}
- CSS-Patterns: ${(designBrief.cssPatterns || []).join(', ') || 'keine'}
- Stimmung: ${(designBrief.moodKeywords || []).join(', ') || 'nicht verfuegbar'}

WICHTIG: Lass dich von der Recherche inspirieren und kombiniere die Ideen kreativ.
Kopiere keine Websites direkt — erstelle etwas Eigenes, Einzigartiges.
`
}
