// WordPress Install-Steps

import { runCommand, runCommandLive } from '../run-command'
import { createDatabase } from '../database'
import { generateStarterContent } from '../ai-generate'
import { generateScaffold, generateNavFooterCSS } from '../wp-scaffold'
import { randomPassword, getGitUrl, getGitConf, getGitCredentialHelper, WP_MODULES_CACHE } from './shared'
import { getConfig, getAdminEmail } from '../config.js'
import { escapeShellArg } from '../validate.js'

export function getWordPressSteps(project) {
  const { name, domain, database, gitMode } = project
  const projectPath = `/home/deploy/apps/${name}`
  const adminPassword = randomPassword()
  const config = getConfig()
  const isAgentMode = config.aiAgentMode && config.aiProvider === 'anthropic' && project.aiDescription
  const steps = []

  // 1. DB erstellen
  steps.push({
    name: 'Datenbank erstellen',
    run: async () => createDatabase(database)
  })

  // 2. WP herunterladen (sudo rm fuer sauberen Start bei Retry)
  steps.push({
    name: 'WordPress herunterladen',
    cmd: `sudo rm -rf ${escapeShellArg(projectPath)} && mkdir -p ${escapeShellArg(projectPath)} && wp core download --path=${escapeShellArg(projectPath)} --locale=de_DE`
  })

  // 3. wp-config.php erstellen
  steps.push({
    name: 'wp-config.php erstellen',
    cmd: `wp config create --path=${escapeShellArg(projectPath)} --dbname=${escapeShellArg(database.name)} --dbuser=${escapeShellArg(database.user)} --dbpass=${escapeShellArg(database.password)} --dbhost=${escapeShellArg(database.host)}`
  })

  // 4. WP installieren
  steps.push({
    name: 'WordPress installieren',
    cmd: `wp core install --path=${escapeShellArg(projectPath)} --url=${escapeShellArg('https://' + domain)} --title=${escapeShellArg(name)} --admin_user=admin --admin_password=${escapeShellArg(adminPassword)} --admin_email=${escapeShellArg(getAdminEmail())} --skip-email`
  })

  // 5. Schreibbare Verzeichnisse fuer PHP-FPM (nur uploads + cache, nicht alles)
  steps.push({
    name: 'Berechtigungen setzen',
    cmd: `mkdir -p ${projectPath}/wp-content/uploads && sudo chown -R www-data:www-data ${projectPath}/wp-content/uploads 2>/dev/null; echo "Berechtigungen gesetzt"`
  })

  // 6. AI JSON generieren (optional — vor Scaffold, damit themeConfig verfuegbar ist)
  const themePath = `${projectPath}/wp-content/themes/${name}`
  let aiSiteData = null

  if (project.aiDescription && !isAgentMode) {
    steps.push({
      name: 'AI Starter Content generieren',
      run: async () => {
        try {
          const result = await generateStarterContent(project, themePath)
          if (result.success && result.siteData) {
            aiSiteData = result.siteData
          }
          if (!result.success) {
            return { success: true, costUsd: result.costUsd, output: `AI uebersprungen: ${result.error}` }
          }
          if (result.hybrid) {
            console.log(`[AI] WP Hybrid-Modus: ${result.output}`)
          }
          return result
        } catch (err) {
          return { success: true, output: `AI uebersprungen: ${err.message}` }
        }
      }
    })
  }

  // 7. Theme Scaffold generieren
  if (isAgentMode) {
    // Agent Mode: Minimales Scaffold — Agent erstellt Blocks und Styles selbst
    steps.push({
      name: 'Minimales Theme-Scaffold erstellen',
      run: async () => {
        const fs = await import('fs')
        const pathMod = await import('path')

        const dirs = ['templates', 'parts', 'src/blocks', 'src/scss', 'includes']
        for (const dir of dirs) {
          fs.mkdirSync(pathMod.join(themePath, dir), { recursive: true })
        }

        const ns = name.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')
        const cap = name.charAt(0).toUpperCase() + name.slice(1)

        // style.css — nur Theme Header (Agent ueberschreibt mit eigenen Styles)
        fs.writeFileSync(pathMod.join(themePath, 'style.css'), `/*
Theme Name: ${cap}
Text Domain: ${name}
Version: 1.0.0
Requires at least: 6.0
Requires PHP: 8.0
*/
`)

        // functions.php — Block Scanner (Agent darf diese Datei NICHT aendern)
        fs.writeFileSync(pathMod.join(themePath, 'functions.php'), `<?php
namespace ${ns};

function setup() {
    add_theme_support('wp-block-styles');
    add_theme_support('editor-styles');
    add_theme_support('post-thumbnails');
    add_theme_support('custom-logo');
}
add_action('after_setup_theme', __NAMESPACE__ . '\\\\setup');

function enqueue_assets() {
    wp_enqueue_style('${name}-style', get_stylesheet_uri());
}
add_action('wp_enqueue_scripts', __NAMESPACE__ . '\\\\enqueue_assets');

function enqueue_nav_script() {
    $js = "document.addEventListener('DOMContentLoaded',function(){var h=document.querySelector('.site-header');if(!h)return;var fn=function(){h.classList.toggle('site-header--scrolled',window.scrollY>20)};window.addEventListener('scroll',fn,{passive:true});fn()});";
    wp_register_script('${name}-nav-scroll', false);
    wp_enqueue_script('${name}-nav-scroll');
    wp_add_inline_script('${name}-nav-scroll', $js);
}
add_action('wp_enqueue_scripts', __NAMESPACE__ . '\\\\enqueue_nav_script');

function register_custom_blocks() {
    $blocks_dir = get_template_directory() . '/build/blocks/';
    $theme_slug = basename(get_template_directory());
    if (!is_dir($blocks_dir)) return;
    foreach (scandir($blocks_dir) as $block) {
        if ($block === '.' || $block === '..') continue;
        if (!is_dir($blocks_dir . $block)) continue;
        $render_file = get_template_directory() . '/includes/render-' . $block . '.php';
        $args = [];
        if (file_exists($render_file)) {
            ob_start();
            require_once $render_file;
            ob_end_clean();
            $block_clean = str_replace('-', '_', $block);
            $candidates = [
                $theme_slug . '_render_' . $block_clean,
                $theme_slug . '_render_' . $block_clean . '_block',
                'render_' . $block_clean,
                'render_' . $block_clean . '_block',
                $theme_slug . '_' . $block_clean . '_render',
            ];
            $found_func = null;
            foreach ($candidates as $c) {
                if (function_exists($c)) { $found_func = $c; break; }
            }
            if ($found_func) {
                $args['render_callback'] = $found_func;
            } else {
                $args['render_callback'] = function($attributes) use ($render_file) {
                    ob_start();
                    include $render_file;
                    return ob_get_clean();
                };
            }
        }
        register_block_type($blocks_dir . $block, $args);
    }
}
add_action('init', __NAMESPACE__ . '\\\\register_custom_blocks');

function register_block_category($categories) {
    array_unshift($categories, ['slug' => '${name}', 'title' => '${cap}']);
    return $categories;
}
add_filter('block_categories_all', __NAMESPACE__ . '\\\\register_block_category');
`)

        // package.json
        fs.writeFileSync(pathMod.join(themePath, 'package.json'), JSON.stringify({
          name: name,
          scripts: { build: 'wp-scripts build', start: 'wp-scripts start' },
          devDependencies: { '@wordpress/scripts': '^27.0.0' },
        }, null, 2) + '\n')

        // theme.json (minimal — Agent ueberschreibt)
        fs.writeFileSync(pathMod.join(themePath, 'theme.json'), JSON.stringify({
          $schema: 'https://schemas.wp.org/trunk/theme.json',
          version: 3,
          settings: {
            layout: { contentSize: '1200px', wideSize: '1400px' },
          },
        }, null, 2) + '\n')

        // Templates
        const baseTemplate = `<!-- wp:template-part {"slug":"header","tagName":"header"} /-->\n<!-- wp:post-content /-->\n<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->\n`
        for (const tpl of ['index.html', 'front-page.html', 'page.html', 'single.html']) {
          fs.writeFileSync(pathMod.join(themePath, 'templates', tpl), baseTemplate)
        }

        // Parts — Farben/Spacing/Typo ueber WP Block-Attribute, CSS nur fuer Effekte
        fs.writeFileSync(pathMod.join(themePath, 'parts', 'header.html'),
`<!-- wp:group {"tagName":"nav","className":"site-header","style":{"spacing":{"padding":{"top":"0","right":"0","bottom":"0","left":"0"}}}} -->\n<nav class="wp-block-group site-header" style="padding-top:0;padding-right:0;padding-bottom:0;padding-left:0"><!-- wp:group {"layout":{"type":"flex","justifyContent":"space-between","flexWrap":"nowrap"},"style":{"spacing":{"padding":{"top":"0.75rem","right":"2rem","bottom":"0.75rem","left":"2rem"},"blockGap":"1.5rem"}}} -->\n<div class="wp-block-group" style="padding-top:0.75rem;padding-right:2rem;padding-bottom:0.75rem;padding-left:2rem"><!-- wp:site-title {"style":{"typography":{"fontSize":"1.35rem","fontWeight":"800","letterSpacing":"-0.02em","textDecoration":"none"},"elements":{"link":{"color":{"text":"var(--wp--preset--color--text, #111827)"},"typography":{"textDecoration":"none"}}}}} /--><!-- wp:navigation {"overlayMenu":"mobile","layout":{"type":"flex","flexWrap":"nowrap"},"fontSize":"small","style":{"typography":{"fontWeight":"500","textDecoration":"none"},"spacing":{"blockGap":"0.25rem"}},"customTextColor":"var(--wp--preset--color--text-muted, #6b7280)"} /--></div>\n<!-- /wp:group --></nav>\n<!-- /wp:group -->\n`)
        fs.writeFileSync(pathMod.join(themePath, 'parts', 'footer.html'),
`<!-- wp:group {"tagName":"footer","className":"site-footer","style":{"color":{"background":"#111827","text":"#d1d5db"},"spacing":{"padding":{"top":"0","right":"0","bottom":"0","left":"0"}}}} -->\n<footer class="wp-block-group site-footer" style="background-color:#111827;color:#d1d5db;padding-top:0;padding-right:0;padding-bottom:0;padding-left:0"><!-- wp:group {"style":{"spacing":{"padding":{"top":"3.5rem","right":"2rem","bottom":"2rem","left":"2rem"}}},"layout":{"type":"constrained","contentSize":"1200px"}} -->\n<div class="wp-block-group" style="padding-top:3.5rem;padding-right:2rem;padding-bottom:2rem;padding-left:2rem"><!-- wp:columns {"style":{"spacing":{"blockGap":{"left":"3rem"}}}} -->\n<div class="wp-block-columns"><!-- wp:column -->\n<div class="wp-block-column"><!-- wp:site-title {"style":{"typography":{"fontSize":"1.3rem","fontWeight":"800","textDecoration":"none"},"elements":{"link":{"color":{"text":"#ffffff"},"typography":{"textDecoration":"none"}}}}} /-->\n<!-- wp:paragraph {"style":{"color":{"text":"#9ca3af"},"typography":{"fontSize":"0.9rem"},"spacing":{"margin":{"top":"0.75rem"}}}} -->\n<p style="color:#9ca3af;font-size:0.9rem;margin-top:0.75rem">Qualit&auml;t und Zuverl&auml;ssigkeit seit Jahren.</p>\n<!-- /wp:paragraph --></div>\n<!-- /wp:column -->\n<!-- wp:column -->\n<div class="wp-block-column"><!-- wp:heading {"level":4,"style":{"color":{"text":"#ffffff"},"typography":{"fontSize":"0.75rem","fontWeight":"700","textTransform":"uppercase","letterSpacing":"0.1em"},"spacing":{"margin":{"bottom":"1rem"}}}} -->\n<h4 class="wp-block-heading" style="color:#ffffff;font-size:0.75rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:1rem">Navigation</h4>\n<!-- /wp:heading -->\n<!-- wp:navigation {"overlayMenu":"never","layout":{"type":"flex","orientation":"vertical"},"customTextColor":"#9ca3af","style":{"typography":{"fontSize":"0.9rem","textDecoration":"none"},"spacing":{"blockGap":"0.35rem"}}} /--></div>\n<!-- /wp:column --></div>\n<!-- /wp:columns -->\n<!-- wp:group {"style":{"border":{"top":{"color":"rgba(255,255,255,0.08)","width":"1px"}},"spacing":{"padding":{"top":"1.5rem"}}},"layout":{"type":"constrained"}} -->\n<div class="wp-block-group" style="border-top-color:rgba(255,255,255,0.08);border-top-width:1px;padding-top:1.5rem"><!-- wp:paragraph {"align":"center","style":{"color":{"text":"#6b7280"},"typography":{"fontSize":"0.8rem"}}} -->\n<p class="has-text-align-center" style="color:#6b7280;font-size:0.8rem">&copy; ${new Date().getFullYear()} ${cap}. Alle Rechte vorbehalten.</p>\n<!-- /wp:paragraph --></div>\n<!-- /wp:group --></div>\n<!-- /wp:group --></footer>\n<!-- /wp:group -->\n`)

        // .gitignore
        fs.writeFileSync(pathMod.join(themePath, '.gitignore'), 'node_modules/\nbuild/\n')

        return { success: true, output: 'Minimales Theme-Scaffold erstellt (Agent Mode)' }
      }
    })
  } else {
    // Standard: Volles Scaffold mit vorgebauten Blocks + themeConfig von AI
    steps.push({
      name: 'Theme Scaffold generieren',
      run: async () => {
        const fs = await import('fs')
        if (!fs.existsSync(themePath)) fs.mkdirSync(themePath, { recursive: true })
        const themeConfig = aiSiteData ? {
          primary: aiSiteData.theme.primary,
          secondary: aiSiteData.theme.secondary,
          mode: aiSiteData.theme.mode,
          font: aiSiteData.theme.font,
        } : null
        return generateScaffold(name, themePath, themeConfig)
      }
    })
  }

  // 9. Dependencies installieren / Blocks bauen
  steps.push({
    name: isAgentMode ? 'Dependencies installieren' : 'Blocks bauen',
    run: async (onOutput) => {
      const fs = await import('fs')

      // Standard-Modus: Skip wenn keine Blocks vorhanden
      if (!isAgentMode) {
        const blocksDir = `${themePath}/src/blocks`
        if (!fs.existsSync(blocksDir) || fs.readdirSync(blocksDir).filter(d => fs.statSync(`${blocksDir}/${d}`).isDirectory()).length === 0) {
          return { success: true, output: 'Keine Blocks — Build uebersprungen' }
        }
      }

      // Cache als Verzeichnis mit Hardlinks (statt tar.gz — viel schneller)
      const wpCacheDir = WP_MODULES_CACHE.replace('.tar.gz', '')
      const cacheCheck = await runCommand(`test -d ${wpCacheDir}/node_modules && echo "hit"`)
      if (cacheCheck.success && cacheCheck.output.includes('hit')) {
        if (onOutput) onOutput('node_modules aus Cache verlinken...\n')
        const cpResult = await runCommand(`cp -al ${wpCacheDir}/node_modules ${themePath}/node_modules 2>&1`)
        if (!cpResult.success) {
          if (onOutput) onOutput('Hardlink fehlgeschlagen, bun install...\n')
          const installResult = await runCommandLive(`cd ${themePath} && if [ -f .env ]; then mv .env .env.bak; fi && bun install 2>&1; EXIT=$?; if [ -f .env.bak ]; then mv .env.bak .env; fi; exit $EXIT`, 600000, onOutput)
          if (!installResult.success) return { success: true, output: `bun install fehlgeschlagen: ${(installResult.error || '').substring(0, 500)}` }
        }
      } else {
        const installResult = await runCommandLive(`cd ${themePath} && if [ -f .env ]; then mv .env .env.bak; fi && bun install 2>&1; EXIT=$?; if [ -f .env.bak ]; then mv .env.bak .env; fi; exit $EXIT`, 600000, onOutput)
        if (!installResult.success) return { success: true, output: `bun install fehlgeschlagen: ${(installResult.error || '').substring(0, 500)}` }
        if (onOutput) onOutput('node_modules cachen...\n')
        await runCommand(`rm -rf ${wpCacheDir} && mkdir -p ${wpCacheDir} && cp -al ${themePath}/node_modules ${wpCacheDir}/node_modules`)
        // Alte tar.gz aufräumen
        await runCommand(`rm -f ${WP_MODULES_CACHE} 2>/dev/null; true`)
      }

      // Build nur im Standard-Modus — Agent baut selbst
      if (!isAgentMode) {
        const buildResult = await runCommandLive(`cd ${themePath} && bun run build 2>&1`, 300000, onOutput)
        if (!buildResult.success) return { success: true, output: `Build fehlgeschlagen: ${(buildResult.error || '').substring(0, 500)}` }
      }

      return { success: true, output: isAgentMode ? 'Dependencies installiert' : 'Blocks gebaut' }
    }
  })

  // 9b. Agent Mode: AI Agent generiert Blocks, Styles und baut
  if (isAgentMode) {
    steps.push({
      name: 'AI Agent Website generieren',
      run: async (onOutput) => {
        if (onOutput) onOutput('→ Agent Mode aktiviert\n')
        let totalCostUsd = 0

        // Design-Recherche (WebSearch + WebFetch)
        let designBrief = null
        try {
          const { runDesignResearch } = await import('../ai/research.js')
          designBrief = await runDesignResearch(project.aiDescription, onOutput)
          if (designBrief?.costUsd) totalCostUsd += designBrief.costUsd
        } catch (e) {
          if (onOutput) onOutput(`→ Design-Recherche uebersprungen: ${e.message}\n`)
        }

        // Kritische Dateien sichern (Agent ueberschreibt sie manchmal trotz Anweisung)
        const fs = await import('fs')
        const pathMod = await import('path')
        const backups = {}
        for (const file of ['package.json', 'functions.php']) {
          const p = pathMod.join(themePath, file)
          try { backups[file] = fs.readFileSync(p, 'utf8') } catch {}
        }

        const { generateWithAgentWP } = await import('../ai/agent-generate.js')
        const agentResult = await generateWithAgentWP(project, themePath, designBrief, onOutput)
        if (agentResult.costUsd) totalCostUsd += agentResult.costUsd
        if (!agentResult.success) {
          if (onOutput) onOutput(`→ Agent fehlgeschlagen: ${agentResult.error}\n`)
          return { success: false, costUsd: totalCostUsd, error: agentResult.error }
        }

        // Kritische Dateien wiederherstellen
        let restored = false
        for (const [file, content] of Object.entries(backups)) {
          const p = pathMod.join(themePath, file)
          try {
            const current = fs.readFileSync(p, 'utf8')
            if (current !== content) {
              fs.writeFileSync(p, content)
              if (onOutput) onOutput(`→ ${file} wiederhergestellt (Agent hatte es geaendert)\n`)
              restored = true
            }
          } catch {}
        }

        // Nav/Footer CSS an style.css anhaengen (Agent generiert oft keine Nav/Footer Styles)
        try {
          const themeJsonPath = pathMod.join(themePath, 'theme.json')
          const stylePath = pathMod.join(themePath, 'style.css')
          if (fs.existsSync(themeJsonPath) && fs.existsSync(stylePath)) {
            const existing = fs.readFileSync(stylePath, 'utf8')
            // Nur anhaengen wenn noch kein Nav/Footer Effekt-CSS vorhanden
            if (!existing.includes('.site-header') || !existing.includes('backdrop-filter')) {
              const tj = JSON.parse(fs.readFileSync(themeJsonPath, 'utf8'))
              const palette = tj?.settings?.color?.palette || []
              const find = (slugs, fb) => { for (const s of slugs) { const c = palette.find(x => x.slug === s); if (c) return c.color } return fb }
              const colors = {
                primary: find(['primary'], '#1e40af'),
                secondary: find(['secondary', 'accent'], '#7c3aed'),
                bg: find(['bg', 'background', 'base'], '#ffffff'),
                text: find(['text', 'foreground'], '#111827'),
                textMuted: find(['text-muted', 'secondary-text', 'muted'], '#6b7280'),
                textInverted: find(['text-inverted', 'contrast', 'white'], '#ffffff'),
                border: find(['border', 'outline'], '#e5e7eb'),
                surface: find(['surface', 'tertiary'], '#f9fafb'),
              }
              const isDark = parseInt(colors.bg.replace('#', ''), 16) < 0x404040
              fs.appendFileSync(stylePath, '\n' + generateNavFooterCSS(colors, isDark))
              if (onOutput) onOutput('→ Nav/Footer CSS an style.css angehaengt\n')
            }
          }
        } catch (cssErr) {
          if (onOutput) onOutput(`→ Nav/Footer CSS uebersprungen: ${cssErr.message}\n`)
        }

        // Block-Dateien fixen: style.scss Import + block.json style-Feld
        const blocksDir = pathMod.join(themePath, 'src/blocks')
        if (fs.existsSync(blocksDir)) {
          for (const blockName of fs.readdirSync(blocksDir)) {
            const blockDir = pathMod.join(blocksDir, blockName)
            if (!fs.statSync(blockDir).isDirectory()) continue

            // index.js: import './style.scss' sicherstellen
            const indexPath = pathMod.join(blockDir, 'index.js')
            if (fs.existsSync(indexPath)) {
              let code = fs.readFileSync(indexPath, 'utf8')
              if (!code.includes("style.scss")) {
                code = "import './style.scss';\n" + code
                fs.writeFileSync(indexPath, code)
                if (onOutput) onOutput(`→ ${blockName}/index.js: style.scss Import ergaenzt\n`)
              }
            }

            // block.json: erstellen falls fehlend, style-Feld korrigieren
            const bjPath = pathMod.join(blockDir, 'block.json')
            if (!fs.existsSync(bjPath)) {
              // block.json fehlt — wp-scripts ignoriert den Block ohne diese Datei
              const bj = {
                apiVersion: 3,
                name: `${name}/${blockName}`,
                title: blockName.charAt(0).toUpperCase() + blockName.slice(1),
                category: name,
                attributes: {},
                editorScript: 'file:./index.js',
                style: 'file:./style-index.css',
              }
              // Attribute aus index.js extrahieren (attributes: {...})
              if (fs.existsSync(indexPath)) {
                const code = fs.readFileSync(indexPath, 'utf8')
                const attrMatch = code.match(/attributes\s*:\s*\{([^}]+)\}/)
                if (attrMatch) {
                  for (const m of attrMatch[1].matchAll(/(\w+)/g)) {
                    bj.attributes[m[1]] = { type: 'string', default: '' }
                  }
                }
              }
              fs.writeFileSync(bjPath, JSON.stringify(bj, null, 2) + '\n')
              if (onOutput) onOutput(`→ ${blockName}/block.json: erstellt (fehlte)\n`)
            } else {
              try {
                const bj = JSON.parse(fs.readFileSync(bjPath, 'utf8'))
                let changed = false
                if (bj.editorStyle && !bj.style) {
                  delete bj.editorStyle
                  bj.style = 'file:./style-index.css'
                  changed = true
                } else if (!bj.style || bj.style !== 'file:./style-index.css') {
                  bj.style = 'file:./style-index.css'
                  changed = true
                }
                if (changed) {
                  fs.writeFileSync(bjPath, JSON.stringify(bj, null, 2) + '\n')
                  if (onOutput) onOutput(`→ ${blockName}/block.json: style-Feld korrigiert\n`)
                }
              } catch {}
            }
          }
        }

        // Render-PHP: Namespace + register_block_type() entfernen
        // (functions.php registriert Blocks via build/blocks/ Pfad — doppelte Registrierung bricht CSS)
        // (Namespace in Render-Dateien verursacht "Cannot redeclare" weil function_exists im globalen NS sucht)
        const includesDir = pathMod.join(themePath, 'includes')
        if (fs.existsSync(includesDir)) {
          for (const file of fs.readdirSync(includesDir)) {
            if (!file.startsWith('render-') || !file.endsWith('.php')) continue
            const filePath = pathMod.join(includesDir, file)
            try {
              let php = fs.readFileSync(filePath, 'utf8')
              let changed = false
              // Namespace entfernen (verursacht Cannot redeclare)
              if (php.match(/^namespace\s+/m)) {
                php = php.replace(/^namespace\s+[^;]+;\s*\n?/m, '')
                changed = true
                if (onOutput) onOutput(`→ ${file}: namespace entfernt\n`)
              }
              // register_block_type entfernen
              if (php.includes('register_block_type')) {
                php = php.replace(/\n?register_block_type\([\s\S]*?\);/g, '')
                changed = true
                if (onOutput) onOutput(`→ ${file}: register_block_type entfernt\n`)
              }
              if (changed) {
                php = php.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
                fs.writeFileSync(filePath, php)
              }
            } catch {}
          }
        }

        // Dependencies + Build (immer, da Agent package.json geaendert haben koennte)
        if (restored) {
          if (onOutput) onOutput('→ bun install (nach Wiederherstellung)...\n')
          await runCommandLive(`cd ${themePath} && if [ -f .env ]; then mv .env .env.bak; fi && bun install 2>&1; EXIT=$?; if [ -f .env.bak ]; then mv .env.bak .env; fi; exit $EXIT`, 300000, onOutput)
        }

        // Build immer ausfuehren (Agent hat evtl. nicht gebaut oder falsch gebaut)
        if (onOutput) onOutput('→ bun run build...\n')
        const buildResult = await runCommandLive(`cd ${themePath} && bun run build 2>&1`, 300000, onOutput)
        if (!buildResult.success) {
          if (onOutput) onOutput(`→ Build fehlgeschlagen: ${(buildResult.error || '').substring(0, 300)}\n`)
          return { success: true, costUsd: totalCostUsd, output: `Agent erfolgreich, Build fehlgeschlagen: ${(buildResult.error || '').substring(0, 300)}` }
        }

        if (onOutput) onOutput('→ Agent Mode erfolgreich\n')
        return { ...agentResult, costUsd: totalCostUsd }
      }
    })
  }

  // 10. Theme aktivieren
  steps.push({
    name: 'Theme aktivieren',
    cmd: `wp theme activate ${escapeShellArg(name)} --path=${escapeShellArg(projectPath)}`
  })

  // 11. Test-Inhalte mit Custom Blocks auf der Startseite
  if (project.aiDescription) {
    steps.push({
      name: 'Test-Inhalte einfuegen',
      run: async () => {
        const fs = await import('fs')

        const frontpagePath = `${themePath}/_frontpage.html`
        let content = ''

        if (fs.existsSync(frontpagePath)) {
          content = fs.readFileSync(frontpagePath, 'utf8').trim()
          try { fs.unlinkSync(frontpagePath) } catch {}
        }

        if (!content) {
          return { success: true, output: 'Keine Startseiten-Inhalte von AI generiert' }
        }

        const tmpFile = `/tmp/wp-frontpage-${name}.html`
        fs.writeFileSync(tmpFile, content)

        const createResult = await runCommand(
          `wp post create ${tmpFile} --path=${escapeShellArg(projectPath)} --post_type=page --post_title="Startseite" --post_status=publish --porcelain`
        )
        try { fs.unlinkSync(tmpFile) } catch {}

        if (!createResult.success) {
          return { success: true, output: `Startseite konnte nicht erstellt werden: ${(createResult.error || '').substring(0, 200)}` }
        }

        const pageId = createResult.output.trim()
        await runCommand(`wp option update page_on_front ${pageId} --path=${escapeShellArg(projectPath)}`)
        await runCommand(`wp option update show_on_front page --path=${escapeShellArg(projectPath)}`)

        return { success: true, output: `Startseite erstellt (Seite #${pageId})` }
      }
    })
  }

  // 12. Git init + push
  const gitUrl = getGitUrl(project.repo)
  if (gitMode === 'full') {
    steps.push({
      name: 'Git Push (komplettes WP)',
      cmd: `cd ${projectPath} && git init -b main && git add -A && git ${getGitConf()} commit -m "WordPress Installation" && git remote add origin ${gitUrl} && git ${getGitCredentialHelper()} push -u origin main --force`
    })
  } else if (gitMode === 'theme-only') {
    steps.push({
      name: 'Git Push (Theme)',
      cmd: `cd ${themePath} && rm -rf .git && git init -b main && git add -A && git ${getGitConf()} commit -m "WordPress Theme" && git remote add origin ${gitUrl} && git ${getGitCredentialHelper()} push -u origin main --force`
    })
  }

  return { steps, info: { adminPassword, adminUrl: `https://${domain}/wp-admin` } }
}
