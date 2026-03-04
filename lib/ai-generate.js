import path from 'path'
import fs from 'fs'
import { getConfig } from './config'
import { FRAMEWORK_PROMPTS, HYBRID_NEXTJS_PROMPT, HYBRID_WP_PROMPT, HYBRID_REDAXO_PROMPT, HYBRID_CMS_PROMPT, buildUserPrompt } from './ai/prompts.js'
import { AI_MODELS, PROVIDERS, TIMEOUT_MS, calculateCost } from './ai/providers.js'
import { parseAiFiles, parseSiteDataJson, parseHybridSiteData, parseHybridRedaxoData, parseHybridCmsData } from './ai/parse.js'
import {
  isProtectedFile, validateAndFixImports,
  buildSiteFromJson, buildHybridSiteFromJson,
  buildWordPressSiteFromJson, buildRedaxoSiteFromJson,
  buildHybridWpSiteFromJson, buildHybridRedaxoSiteFromJson,
  buildHybridTypo3SiteFromJson, buildHybridContaoSiteFromJson,
  validateHybridBuild, mapToRegistrySections,
  setTrackContext, clearTrackContext,
} from './ai/build.js'
import { trackFile } from './deploy-log'
import { applyRequirements } from './generate-requirements.js'

export { AI_MODELS }

export async function generateStarterContent(project, targetPath = null, designBrief = null) {
  const config = getConfig()
  const provider = config.aiProvider || 'anthropic'
  const apiKey = config.aiApiKey
  const models = AI_MODELS[provider]
  const defaultModel = models?.[0]?.id
  const aiModel = config.aiModel || defaultModel

  if (!apiKey) {
    return { success: false, error: 'AI API Key nicht konfiguriert' }
  }

  const providerConfig = PROVIDERS[provider]
  if (!providerConfig) {
    return { success: false, error: `Unbekannter AI Provider: ${provider}` }
  }

  const framework = project.framework
  const isJsonFramework = framework === 'nextjs-starter' || framework === 'wordpress' || framework === 'redaxo' || framework === 'typo3' || framework === 'contao'
  // Hybrid-Prompts: AI generiert Markup + Styles pro Section
  const systemPrompt = framework === 'nextjs-starter'
    ? HYBRID_NEXTJS_PROMPT
    : framework === 'wordpress'
      ? HYBRID_WP_PROMPT
      : framework === 'redaxo'
        ? HYBRID_REDAXO_PROMPT
        : (framework === 'typo3' || framework === 'contao')
          ? HYBRID_CMS_PROMPT
          : FRAMEWORK_PROMPTS[framework]
  if (!systemPrompt) {
    return { success: false, error: `Kein AI-Prompt fuer Framework: ${framework}` }
  }

  const projectPath = targetPath || `/home/deploy/apps/${project.name}`

  // Design-Brief in User-Prompt einfuegen (wenn vorhanden)
  let briefSection = ''
  if (designBrief) {
    try {
      const { buildDesignBriefSection } = await import('./ai/research.js')
      briefSection = buildDesignBriefSection(designBrief)
    } catch {}
  }

  // JSON-Frameworks: JSON-Prompt (kein Code, nur Datenstruktur)
  const userPrompt = isJsonFramework
    ? `Projektname: ${project.name}\nBeschreibung: ${project.aiDescription}\n${briefSection}\nErstelle die Seitenstruktur als JSON-Objekt. Antworte NUR mit dem JSON, OHNE Markdown oder Text.`
    : buildUserPrompt(project.aiDescription, framework, project.name)

  try {
    const reqBody = JSON.stringify(providerConfig.buildBody(systemPrompt, userPrompt, aiModel))
    const headers = providerConfig.buildHeaders(apiKey)

    // Bis zu 5 Versuche bei transient Errors (429, 529) mit exponential backoff
    let response
    for (let attempt = 0; attempt < 5; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, Math.min(10000 * Math.pow(2, attempt - 1), 60000)))
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
      try {
        response = await fetch(providerConfig.url, {
          method: 'POST', headers, body: reqBody, signal: controller.signal,
        })
      } finally {
        clearTimeout(timer)
      }
      if (response.ok || (response.status !== 429 && response.status !== 529)) break
    }

    if (!response.ok) {
      const errText = await response.text()
      return { success: false, error: `AI API Fehler (${response.status}): ${errText.substring(0, 200)}` }
    }

    const data = await response.json()
    const responseText = providerConfig.parseResponse(data)

    // Kosten berechnen
    const usage = providerConfig.parseUsage ? providerConfig.parseUsage(data) : null
    const costUsd = calculateCost(usage, aiModel, provider)

    // File-Tracking aktivieren (fuer Live-FileTree im Frontend)
    if (project.id) setTrackContext(project.id, projectPath)

    // === NEXT.JS STARTER: Hybrid-System (vor generischem JSON-Parsing) ===
    if (framework === 'nextjs-starter') {
      try {
        const parsed = parseHybridSiteData(responseText)

        if (parsed.hybrid) {
          // Hybrid-Modus: AI-generiertes Markup + Styles pro Section
          const usedSections = buildHybridSiteFromJson(parsed.data, projectPath, project.name)

          // Build-Validierung: next build muss durchlaufen
          const buildOk = await validateHybridBuild(projectPath)
          if (buildOk) {
            applyRequirements(projectPath, project, parsed.data)
            return {
              success: true, costUsd,
              hybrid: true,
              output: `[HYBRID] Seite generiert mit ${usedSections.length} Sections: ${usedSections.join(', ')} (Theme: ${parsed.data.theme.primary})`,
            }
          }

          // Build fehlgeschlagen → Fallback auf Registry
          console.log('[HYBRID-FALLBACK] Build fehlgeschlagen, nutze Registry-System')
          const registrySections = mapToRegistrySections(parsed.data)
          if (registrySections) {
            parsed.data.sections = registrySections
            const fallbackSections = buildSiteFromJson(parsed.data, projectPath, project.name)
            applyRequirements(projectPath, project, parsed.data)
            return {
              success: true, costUsd,
              hybrid: false,
              output: `[REGISTRY-FALLBACK] Build fehlgeschlagen → Registry mit ${fallbackSections.length} Sections: ${fallbackSections.join(', ')}`,
            }
          }
        }

        // Kein Hybrid-Format oder Fallback-Mapping fehlgeschlagen → Standard Registry
        const usedSections = buildSiteFromJson(parsed.data, projectPath, project.name)
        applyRequirements(projectPath, project, parsed.data)
        return {
          success: true, costUsd,
          hybrid: false,
          output: `[REGISTRY] Seite generiert mit ${usedSections.length} Sections: ${usedSections.join(', ')} (Theme: ${parsed.data.theme.primary})`,
        }
      } catch (hybridErr) {
        // Kompletter Parse-Fehler → versuche altes Format
        try {
          const siteDataFallback = parseSiteDataJson(responseText)
          const usedSections = buildSiteFromJson(siteDataFallback, projectPath, project.name)
          applyRequirements(projectPath, project, siteDataFallback)
          return {
            success: true, costUsd,
            hybrid: false,
            output: `[REGISTRY-FALLBACK] Parse-Fehler → Registry mit ${usedSections.length} Sections: ${usedSections.join(', ')}`,
          }
        } catch {
          return { success: false, costUsd, error: `AI-Antwort konnte nicht geparst werden: ${hybridErr.message}` }
        }
      }
    }

    // === WORDPRESS: Hybrid-System (AI-generierte Blocks) ===
    if (framework === 'wordpress') {
      try {
        const parsed = parseHybridSiteData(responseText)
        if (parsed.hybrid) {
          const usedSections = buildHybridWpSiteFromJson(parsed.data, projectPath, project.name)
          applyRequirements(projectPath, project, parsed.data)
          return {
            success: true, costUsd, hybrid: true, siteData: parsed.data,
            output: `[HYBRID] WP-Seite: ${usedSections.length} Sections: ${usedSections.join(', ')} (Theme: ${parsed.data.theme.primary})`,
          }
        }
        // Kein Hybrid → Registry-Fallback
        const usedSections = buildWordPressSiteFromJson(parsed.data, projectPath, project.name)
        applyRequirements(projectPath, project, parsed.data)
        return {
          success: true, costUsd, hybrid: false, siteData: parsed.data,
          output: `[REGISTRY] WP-Seite: ${usedSections.length} Sections: ${usedSections.join(', ')} (Theme: ${parsed.data.theme.primary})`,
        }
      } catch (wpErr) {
        try {
          const fallback = parseSiteDataJson(responseText)
          const usedSections = buildWordPressSiteFromJson(fallback, projectPath, project.name)
          applyRequirements(projectPath, project, fallback)
          return {
            success: true, costUsd, hybrid: false, siteData: fallback,
            output: `[REGISTRY-FALLBACK] WP Parse-Fehler → Registry mit ${usedSections.length} Sections: ${usedSections.join(', ')}`,
          }
        } catch {
          return { success: false, costUsd, error: `AI-Antwort konnte nicht geparst werden: ${wpErr.message}` }
        }
      }
    }

    // === REDAXO: Hybrid-System (AI-generierte Module) ===
    if (framework === 'redaxo') {
      try {
        const parsed = parseHybridRedaxoData(responseText)
        if (parsed.hybrid) {
          const usedSections = buildHybridRedaxoSiteFromJson(parsed.data, projectPath, project.name)
          applyRequirements(projectPath, project, parsed.data)
          return {
            success: true, costUsd, hybrid: true,
            output: `[HYBRID] Redaxo-Seite: ${usedSections.length} Sections: ${usedSections.join(', ')} (Theme: ${parsed.data.theme.primary})`,
          }
        }
        // Kein Hybrid → Registry-Fallback
        const usedSections = buildRedaxoSiteFromJson(parsed.data, projectPath, project.name)
        applyRequirements(projectPath, project, parsed.data)
        return {
          success: true, costUsd, hybrid: false,
          output: `[REGISTRY] Redaxo-Seite: ${usedSections.length} Sections: ${usedSections.join(', ')} (Theme: ${parsed.data.theme.primary})`,
        }
      } catch (rexErr) {
        try {
          const fallback = parseSiteDataJson(responseText)
          const usedSections = buildRedaxoSiteFromJson(fallback, projectPath, project.name)
          applyRequirements(projectPath, project, fallback)
          return {
            success: true, costUsd, hybrid: false,
            output: `[REGISTRY-FALLBACK] Redaxo Parse-Fehler → Registry mit ${usedSections.length} Sections: ${usedSections.join(', ')}`,
          }
        } catch {
          return { success: false, costUsd, error: `AI-Antwort konnte nicht geparst werden: ${rexErr.message}` }
        }
      }
    }

    // === TYPO3: Hybrid-System (AI-generiertes HTML + CSS → Site Package + Content-SQL) ===
    if (framework === 'typo3') {
      try {
        const parsed = parseHybridCmsData(responseText)
        if (parsed.hybrid) {
          const usedSections = buildHybridTypo3SiteFromJson(parsed.data, projectPath, project.name)
          applyRequirements(projectPath, project, parsed.data)
          return {
            success: true, costUsd, hybrid: true,
            output: `[HYBRID] TYPO3-Seite: ${usedSections.length} Sections: ${usedSections.join(', ')} (Theme: ${parsed.data.theme.primary})`,
          }
        }
        return { success: false, costUsd, error: 'AI-Antwort hat kein Hybrid-Format (output + css fehlt)' }
      } catch (t3Err) {
        return { success: false, costUsd, error: `AI-Antwort konnte nicht geparst werden: ${t3Err.message}` }
      }
    }

    // === CONTAO: Hybrid-System (AI-generiertes HTML + CSS → Content-SQL) ===
    if (framework === 'contao') {
      try {
        const parsed = parseHybridCmsData(responseText)
        if (parsed.hybrid) {
          const usedSections = buildHybridContaoSiteFromJson(parsed.data, projectPath, project.name)
          applyRequirements(projectPath, project, parsed.data)
          return {
            success: true, costUsd, hybrid: true,
            output: `[HYBRID] Contao-Seite: ${usedSections.length} Sections: ${usedSections.join(', ')} (Theme: ${parsed.data.theme.primary})`,
          }
        }
        return { success: false, costUsd, error: 'AI-Antwort hat kein Hybrid-Format (output + css fehlt)' }
      } catch (ctErr) {
        return { success: false, costUsd, error: `AI-Antwort konnte nicht geparst werden: ${ctErr.message}` }
      }
    }

    // === ANDERE FRAMEWORKS: Datei-basierte Generierung (bestehend) ===
    const files = parseAiFiles(responseText)

    let written = 0
    const skipped = []
    for (const file of files) {
      if (isProtectedFile(file.path)) {
        skipped.push(file.path)
        continue
      }

      const fullPath = path.join(projectPath, file.path)
      const dir = path.dirname(fullPath)

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      fs.writeFileSync(fullPath, file.content, 'utf8')
      if (project.id) trackFile(project.id, fullPath, projectPath, file.content)
      written++
    }

    // Fehlende Imports fixen (nur fuer Nicht-Next.js Frameworks)
    const fixes = validateAndFixImports(projectPath)
    const stubInfo = fixes.stubs.length > 0 ? ` (+${fixes.stubs.length} Stubs: ${fixes.stubs.join(', ')})` : ''
    const skippedInfo = skipped.length > 0 ? ` (${skipped.length} geschuetzt: ${skipped.join(', ')})` : ''
    return {
      success: true, costUsd,
      output: `${written} Datei(en) generiert: ${files.map(f => f.path).join(', ')}${skippedInfo}${stubInfo}`,
    }
  } catch (err) {
    clearTrackContext()
    if (err.name === 'AbortError') {
      return { success: false, error: 'AI API Timeout (2 Minuten ueberschritten)' }
    }
    return { success: false, error: `AI Fehler: ${err.message}` }
  } finally {
    clearTrackContext()
  }
}
