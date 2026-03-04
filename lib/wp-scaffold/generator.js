import fs from 'fs'
import path from 'path'
import { FONT_STACKS, getThemeDefaults, capitalize, phpNamespace, getFontConfig, getGoogleFontsUrl } from '../theme-defaults.js'
import { WP_BLOCKS } from '../sections/index.js'

// ============================================================
// SCAFFOLD GENERATOR
// ============================================================

export function generateScaffold(name, themePath, themeConfig = null) {
  const ns = phpNamespace(name)
  const slug = name

  // Verzeichnisse erstellen
  const dirs = ['templates', 'parts', 'src/scss', 'includes']
  for (const blockName of Object.keys(WP_BLOCKS)) {
    dirs.push(`src/blocks/${blockName}`)
  }
  for (const dir of dirs) {
    fs.mkdirSync(path.join(themePath, dir), { recursive: true })
  }

  // Theme-Config auswerten (von AI oder Defaults)
  const mode = themeConfig?.mode || 'light'
  const defaults = getThemeDefaults(mode)
  const primary = themeConfig?.primary || '#1e40af'
  const secondary = themeConfig?.secondary || '#7c3aed'
  const bg = themeConfig?.background || defaults.bg
  const surface = themeConfig?.surface || defaults.surface
  const surfaceAlt = themeConfig?.surfaceAlt || defaults.surfaceAlt
  const text = themeConfig?.text || defaults.text
  const textMuted = themeConfig?.textMuted || defaults.textMuted
  const textInverted = themeConfig?.textInverted || (mode === 'dark' ? '#111827' : '#ffffff')
  const accent = themeConfig?.accent || primary
  const border = themeConfig?.border || defaults.border
  const fontConfig = getFontConfig(themeConfig?.font)
  const fontStack = fontConfig.body
  const headingStack = fontConfig.heading
  const googleFontsUrl = getGoogleFontsUrl(themeConfig?.font)
  const isDark = mode === 'dark'

  // style.css — Theme Header + globale Base + Nav/Footer Effekte
  fs.writeFileSync(path.join(themePath, 'style.css'), `/*
Theme Name: ${capitalize(name)}
Text Domain: ${name}
Version: 1.0.0
Requires at least: 6.0
Requires PHP: 8.0
*/

/* Base Styles — ergaenzt theme.json Global Styles */
html { scroll-behavior: smooth; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
img { max-width: 100%; height: auto; }

body {
  font-family: ${fontStack};
  background-color: ${bg};
  color: ${text};
  line-height: 1.6;
}

h1, h2, h3, h4, h5, h6 {
  font-family: ${headingStack};
  letter-spacing: -0.02em;
}

/* WordPress Block-Theme: entferne Default-Paddings/Margins */
.wp-site-blocks > * + * { margin-block-start: 0; }
.wp-site-blocks { padding-top: 0 !important; }
.entry-content > *, .wp-block-post-content > * { margin-top: 0 !important; margin-bottom: 0 !important; }

/* ===== Nav: Sticky + Glass + Scroll ===== */
.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: ${isDark ? 'rgba(10,10,10,0.8)' : 'rgba(255,255,255,0.82)'};
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'};
  transition: background 0.3s, box-shadow 0.3s, border-color 0.3s;
}
.site-header.site-header--scrolled {
  background: ${isDark ? 'rgba(10,10,10,0.96)' : 'rgba(255,255,255,0.96)'};
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  border-color: transparent;
}

/* Nav: Hover-Underline */
.site-header .wp-block-navigation a { position: relative; transition: color 0.2s; border-radius: 6px; }
.site-header .wp-block-navigation a::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0.5rem; right: 0.5rem;
  height: 2px;
  background: ${primary};
  border-radius: 1px;
  transform: scaleX(0);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.site-header .wp-block-navigation a:hover { background: ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}; }
.site-header .wp-block-navigation a:hover::after { transform: scaleX(1); }

/* Footer: Animated Gradient Line */
.site-footer::before {
  content: '';
  display: block;
  height: 3px;
  background: linear-gradient(90deg, ${primary}, ${secondary}, ${primary});
  background-size: 200% 100%;
  animation: footer-gradient 6s ease infinite;
}
@keyframes footer-gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Footer: Link Hover */
.site-footer .wp-block-navigation a { transition: color 0.2s, padding-left 0.2s; }
.site-footer .wp-block-navigation a:hover { color: #fff !important; padding-left: 4px; }
`)

  // Shared SCSS — erweiterte _variables mit WP Preset-Referenzen
  fs.writeFileSync(path.join(themePath, 'src/scss/_variables.scss'), `// Theme-Farben (referenzieren theme.json Presets → CSS Custom Properties)
$primary: var(--wp--preset--color--primary);
$secondary: var(--wp--preset--color--secondary);
$bg: var(--wp--preset--color--bg);
$surface: var(--wp--preset--color--surface);
$surface-alt: var(--wp--preset--color--surface-alt);
$text: var(--wp--preset--color--text);
$text-muted: var(--wp--preset--color--text-muted);
$text-inverted: var(--wp--preset--color--text-inverted);
$accent: var(--wp--preset--color--accent);
$border-color: var(--wp--preset--color--border);

// Typography
$font-heading: var(--wp--preset--font-family--heading);

// Spacing
$spacing-xs: 0.5rem;
$spacing-sm: 1rem;
$spacing-md: 1.5rem;
$spacing-lg: 2rem;
$spacing-xl: 3rem;
$spacing-2xl: 4rem;

// Transitions
$transition-fast: 0.2s ease;
$transition-base: 0.3s ease;
$transition-slow: 0.5s ease;

// Shadows
$shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
$shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
$shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.15);
$shadow-card: 0 4px 24px rgba(0, 0, 0, 0.06);

// Border Radius
$radius-sm: 0.375rem;
$radius-md: 0.75rem;
$radius-lg: 1rem;
`)

  fs.writeFileSync(path.join(themePath, 'src/scss/_animations.scss'), `@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeInLeft {
  from { opacity: 0; transform: translateX(-30px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes fadeInRight {
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
`)

  fs.writeFileSync(path.join(themePath, 'src/scss/_mixins.scss'), `@use 'variables' as *;

@mixin respond-to($bp) {
  @if $bp == sm { @media (min-width: 640px) { @content; } }
  @else if $bp == md { @media (min-width: 768px) { @content; } }
  @else if $bp == lg { @media (min-width: 1024px) { @content; } }
  @else if $bp == xl { @media (min-width: 1280px) { @content; } }
}

@mixin section-base {
  position: relative;
  padding: clamp(4rem, 8vw, 7rem) $spacing-md;
  overflow: hidden;
}

@mixin container {
  max-width: 72rem;
  margin-left: auto;
  margin-right: auto;
  padding-left: $spacing-md;
  padding-right: $spacing-md;
}

@mixin section-title {
  font-size: clamp(1.75rem, 3vw, 2.75rem);
  font-weight: 700;
  font-family: $font-heading;
  text-align: center;
  color: $text;
  margin-bottom: 4rem;
  letter-spacing: -0.02em;
}

@mixin card-hover {
  transition: transform $transition-base, box-shadow $transition-base;
  &:hover {
    transform: translateY(-4px);
    box-shadow: $shadow-lg;
  }
}
`)

  fs.writeFileSync(path.join(themePath, 'src/scss/_base.scss'), `@use 'variables' as *;

body {
  font-family: ${fontStack};
  color: $text;
  background: $bg;
  line-height: 1.6;
}

*, *::before, *::after { box-sizing: border-box; }
img { max-width: 100%; height: auto; }
`)

  // Shared Editor-SCSS — Inline-Inputs, Card-Remove, Add-Button
  fs.writeFileSync(path.join(themePath, 'src/scss/_editor.scss'), `/* Inline-editable Inputs — unsichtbar bis Hover/Focus */
.${slug}-editor-input {
  background: none;
  border: none;
  border-bottom: 1.5px solid transparent;
  outline: none;
  font: inherit;
  color: inherit;
  width: 100%;
  padding: 2px 0;
  transition: border-color 0.2s, background 0.2s;
  resize: none;
  line-height: inherit;
  box-sizing: border-box;
  &:hover { border-bottom-color: rgba(0,0,0,0.12); }
  &:focus { border-bottom-color: var(--wp-admin-theme-color, #007cba); background: rgba(0, 124, 186, 0.03); }
  &::placeholder { color: currentColor; opacity: 0.35; font-style: italic; }
}

/* Icon-Input — quadratisch, zentriert */
.${slug}-editor-input--icon {
  width: 3rem;
  height: 3rem;
  text-align: center;
  font-size: 2rem;
  line-height: 1;
  border-radius: 0.5rem;
  border-bottom: none;
  padding: 0;
  display: block;
  margin-bottom: 0.75rem;
  &:hover { background: rgba(0,0,0,0.04); border-bottom: none; }
  &:focus { background: rgba(0, 124, 186, 0.06); border-bottom: none; box-shadow: 0 0 0 2px var(--wp-admin-theme-color, #007cba); }
}

/* Zentrierter Input (Stats, Contact) */
.${slug}-editor-input--center { text-align: center; }

/* Card mit Remove-Button (x) */
.${slug}-editor-card { position: relative; }
.${slug}-editor-card__remove {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,0.06);
  color: #999;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  padding: 0;
}
.${slug}-editor-card:hover .${slug}-editor-card__remove { opacity: 1; }
.${slug}-editor-card__remove:hover { background: #e53e3e; color: white; transform: scale(1.1); }

/* Add-Button — gestrichelte Border, volle Breite */
.${slug}-editor-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 1.25rem 1rem;
  border: 2px dashed rgba(0,0,0,0.12);
  border-radius: 1rem;
  background: none;
  color: #888;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  grid-column: 1 / -1;
  min-height: 60px;
  &:hover { border-color: var(--wp-admin-theme-color, #007cba); color: var(--wp-admin-theme-color, #007cba); background: rgba(0, 124, 186, 0.03); }
}
.${slug}-editor-add__icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 300;
  transition: background 0.2s;
}
.${slug}-editor-add:hover .${slug}-editor-add__icon { background: rgba(0, 124, 186, 0.1); }

/* Inline-Variante (Highlights, FAQ) */
.${slug}-editor-add--inline { padding: 0.75rem 1rem; min-height: auto; border-radius: 0.75rem; }

/* Dark-Variante (Stats) */
.${slug}-editor-add--dark { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.5); }
.${slug}-editor-add--dark:hover { border-color: rgba(255,255,255,0.4); color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.05); }
.${slug}-editor-add--dark .${slug}-editor-add__icon { background: rgba(255,255,255,0.1); }

/* Gallery Overlay im Editor immer sichtbar */
.${slug}-gallery__overlay--edit { opacity: 1; }
.${slug}-gallery__overlay--edit .${slug}-editor-input { color: white; }
.${slug}-gallery__overlay--edit .${slug}-editor-input:hover { border-bottom-color: rgba(255,255,255,0.3); }
.${slug}-gallery__overlay--edit .${slug}-editor-input:focus { border-bottom-color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.1); }
.${slug}-gallery__overlay--edit .${slug}-editor-input::placeholder { color: rgba(255,255,255,0.5); }

/* Stats Inputs (helle Farben auf dunklem Hintergrund) */
.${slug}-stats__item .${slug}-editor-input { color: inherit; }
.${slug}-stats__item .${slug}-editor-input:hover { border-bottom-color: rgba(255,255,255,0.2); }
.${slug}-stats__item .${slug}-editor-input:focus { border-bottom-color: rgba(255,255,255,0.6); background: rgba(255,255,255,0.05); }
.${slug}-stats__item .${slug}-editor-input::placeholder { color: rgba(255,255,255,0.3); }
.${slug}-stats__item .${slug}-editor-card__remove { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); }

/* Testimonials Inputs */
.${slug}-testimonials__card .${slug}-editor-input { font-style: inherit; }

/* About Highlights Input */
.${slug}-about__highlight .${slug}-editor-input { flex: 1; }

/* Button-Input (Hero, CTA) — inline-editable auf farbigem Hintergrund */
.${slug}-editor-input--btn {
  border: none;
  border-bottom: 2px dashed transparent;
  outline: none;
  font: inherit;
  text-align: center;
  cursor: text;
  background: transparent;
  color: inherit;
  width: auto;
  min-width: 8rem;
  box-sizing: border-box;
  &:hover { border-bottom-color: rgba(255,255,255,0.4); }
  &:focus { border-bottom-color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.08); }
  &::placeholder { color: rgba(255,255,255,0.5); font-style: italic; }
}
`)

  // functions.php — mit dynamischen Block-Render-Callbacks
  fs.writeFileSync(path.join(themePath, 'functions.php'), `<?php
namespace ${ns};

function setup() {
    add_theme_support('wp-block-styles');
    add_theme_support('editor-styles');
    add_theme_support('post-thumbnails');
    add_theme_support('custom-logo');
}
add_action('after_setup_theme', __NAMESPACE__ . '\\\\setup');

function enqueue_assets() {
    wp_enqueue_style('${slug}-style', get_stylesheet_uri());${googleFontsUrl ? `\n    wp_enqueue_style('${slug}-google-fonts', '${googleFontsUrl}', [], null);` : ''}
}
add_action('wp_enqueue_scripts', __NAMESPACE__ . '\\\\enqueue_assets');

function enqueue_nav_script() {
    $js = "document.addEventListener('DOMContentLoaded',function(){var h=document.querySelector('.site-header');if(!h)return;var fn=function(){h.classList.toggle('site-header--scrolled',window.scrollY>20)};window.addEventListener('scroll',fn,{passive:true});fn()});";
    wp_register_script('${slug}-nav-scroll', false);
    wp_enqueue_script('${slug}-nav-scroll');
    wp_add_inline_script('${slug}-nav-scroll', $js);
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
    array_unshift($categories, ['slug' => '${slug}', 'title' => '${capitalize(name)}']);
    return $categories;
}
add_filter('block_categories_all', __NAMESPACE__ . '\\\\register_block_category');
`)

  // theme.json — erweiterte Farbpalette mit 13 Presets
  fs.writeFileSync(path.join(themePath, 'theme.json'), JSON.stringify({
    $schema: 'https://schemas.wp.org/trunk/theme.json',
    version: 3,
    settings: {
      color: { palette: [
        { slug: 'primary', color: primary, name: 'Primaer' },
        { slug: 'secondary', color: secondary, name: 'Sekundaer' },
        { slug: 'bg', color: bg, name: 'Hintergrund' },
        { slug: 'surface', color: surface, name: 'Oberflaeche' },
        { slug: 'surface-alt', color: surfaceAlt, name: 'Oberflaeche Alt' },
        { slug: 'text', color: text, name: 'Text' },
        { slug: 'text-muted', color: textMuted, name: 'Text Gedaempft' },
        { slug: 'text-inverted', color: textInverted, name: 'Text Invertiert' },
        { slug: 'accent', color: accent, name: 'Akzent' },
        { slug: 'border', color: border, name: 'Rahmen' },
        { slug: 'dark', color: '#111827', name: 'Dunkel' },
        { slug: 'light', color: '#f9fafb', name: 'Hell' },
        { slug: 'white', color: '#ffffff', name: 'Weiss' },
      ]},
      typography: {
        fontFamilies: [
          { slug: 'body', fontFamily: fontStack, name: 'Body' },
          { slug: 'heading', fontFamily: headingStack, name: 'Heading' },
        ],
        fontSizes: [
          { slug: 'small', size: '0.875rem', name: 'Klein' },
          { slug: 'medium', size: '1rem', name: 'Mittel' },
          { slug: 'large', size: '1.5rem', name: 'Gross' },
          { slug: 'x-large', size: '2.25rem', name: 'Sehr Gross' },
        ],
      },
      spacing: {
        units: ['px', 'em', 'rem', '%', 'vw'],
        spacingSizes: [
          { slug: '10', size: '0.5rem', name: 'XS' },
          { slug: '20', size: '1rem', name: 'S' },
          { slug: '30', size: '1.5rem', name: 'M' },
          { slug: '40', size: '2rem', name: 'L' },
          { slug: '50', size: '3rem', name: 'XL' },
          { slug: '60', size: '4rem', name: 'XXL' },
        ],
      },
      layout: { contentSize: '1200px', wideSize: '1400px' },
    },
    styles: {
      color: {
        background: 'var(--wp--preset--color--bg)',
        text: 'var(--wp--preset--color--text)',
      },
      spacing: {
        blockGap: '0',
        padding: { top: '0', bottom: '0', left: '0', right: '0' },
      },
      typography: {
        fontFamily: fontStack,
        fontSize: '1rem',
        lineHeight: '1.6',
      },
      elements: {
        heading: {
          color: { text: 'var(--wp--preset--color--text)' },
          typography: { fontWeight: '700', lineHeight: '1.2' },
        },
        link: {
          color: { text: 'var(--wp--preset--color--primary)' },
        },
      },
    },
  }, null, 2) + '\n')

  // package.json
  fs.writeFileSync(path.join(themePath, 'package.json'), JSON.stringify({
    name: name,
    scripts: { build: 'wp-scripts build', start: 'wp-scripts start' },
    devDependencies: { '@wordpress/scripts': '^27.0.0' },
  }, null, 2) + '\n')

  // .gitignore
  fs.writeFileSync(path.join(themePath, '.gitignore'), `node_modules/\nbuild/\n`)

  // Templates — kein constrained Layout, Blocks steuern eigene Breite
  const baseTemplate = `<!-- wp:template-part {"slug":"header","tagName":"header"} /-->
<!-- wp:post-content /-->
<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
`
  for (const tpl of ['index.html', 'front-page.html', 'page.html', 'single.html']) {
    fs.writeFileSync(path.join(themePath, 'templates', tpl), baseTemplate)
  }

  // Parts — Farben/Spacing/Typo ueber WP Block-Attribute, CSS nur fuer Effekte
  fs.writeFileSync(path.join(themePath, 'parts', 'header.html'),
`<!-- wp:group {"tagName":"nav","className":"site-header","style":{"spacing":{"padding":{"top":"0","right":"0","bottom":"0","left":"0"}}}} -->
<nav class="wp-block-group site-header" style="padding-top:0;padding-right:0;padding-bottom:0;padding-left:0"><!-- wp:group {"layout":{"type":"flex","justifyContent":"space-between","flexWrap":"nowrap"},"style":{"spacing":{"padding":{"top":"0.75rem","right":"2rem","bottom":"0.75rem","left":"2rem"},"blockGap":"1.5rem"}}} -->
<div class="wp-block-group" style="padding-top:0.75rem;padding-right:2rem;padding-bottom:0.75rem;padding-left:2rem"><!-- wp:site-title {"style":{"typography":{"fontSize":"1.35rem","fontWeight":"800","letterSpacing":"-0.02em","textDecoration":"none"},"elements":{"link":{"color":{"text":"${text}"},"typography":{"textDecoration":"none"}}}}} /--><!-- wp:navigation {"overlayMenu":"mobile","layout":{"type":"flex","flexWrap":"nowrap"},"fontSize":"small","style":{"typography":{"fontWeight":"500","textDecoration":"none"},"spacing":{"blockGap":"0.25rem"}},"customTextColor":"${textMuted}"} /--></div>
<!-- /wp:group --></nav>
<!-- /wp:group -->
`)

  fs.writeFileSync(path.join(themePath, 'parts', 'footer.html'),
`<!-- wp:group {"tagName":"footer","className":"site-footer","style":{"color":{"background":"#111827","text":"#d1d5db"},"spacing":{"padding":{"top":"0","right":"0","bottom":"0","left":"0"}}}} -->
<footer class="wp-block-group site-footer" style="background-color:#111827;color:#d1d5db;padding-top:0;padding-right:0;padding-bottom:0;padding-left:0"><!-- wp:group {"style":{"spacing":{"padding":{"top":"3.5rem","right":"2rem","bottom":"2rem","left":"2rem"}}},"layout":{"type":"constrained","contentSize":"1200px"}} -->
<div class="wp-block-group" style="padding-top:3.5rem;padding-right:2rem;padding-bottom:2rem;padding-left:2rem"><!-- wp:columns {"style":{"spacing":{"blockGap":{"left":"3rem"}}}} -->
<div class="wp-block-columns"><!-- wp:column -->
<div class="wp-block-column"><!-- wp:site-title {"style":{"typography":{"fontSize":"1.3rem","fontWeight":"800","textDecoration":"none"},"elements":{"link":{"color":{"text":"#ffffff"},"typography":{"textDecoration":"none"}}}}} /-->
<!-- wp:paragraph {"style":{"color":{"text":"#9ca3af"},"typography":{"fontSize":"0.9rem"},"spacing":{"margin":{"top":"0.75rem"}}}} -->
<p style="color:#9ca3af;font-size:0.9rem;margin-top:0.75rem">Qualit&auml;t und Zuverl&auml;ssigkeit seit Jahren.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column"><!-- wp:heading {"level":4,"style":{"color":{"text":"#ffffff"},"typography":{"fontSize":"0.75rem","fontWeight":"700","textTransform":"uppercase","letterSpacing":"0.1em"},"spacing":{"margin":{"bottom":"1rem"}}}} -->
<h4 class="wp-block-heading" style="color:#ffffff;font-size:0.75rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:1rem">Navigation</h4>
<!-- /wp:heading -->
<!-- wp:navigation {"overlayMenu":"never","layout":{"type":"flex","orientation":"vertical"},"customTextColor":"#9ca3af","style":{"typography":{"fontSize":"0.9rem","textDecoration":"none"},"spacing":{"blockGap":"0.35rem"}}} /--></div>
<!-- /wp:column --></div>
<!-- /wp:columns -->
<!-- wp:group {"style":{"border":{"top":{"color":"rgba(255,255,255,0.08)","width":"1px"}},"spacing":{"padding":{"top":"1.5rem"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group" style="border-top-color:rgba(255,255,255,0.08);border-top-width:1px;padding-top:1.5rem"><!-- wp:paragraph {"align":"center","style":{"color":{"text":"#6b7280"},"typography":{"fontSize":"0.8rem"}}} -->
<p class="has-text-align-center" style="color:#6b7280;font-size:0.8rem">&copy; ${new Date().getFullYear()} ${capitalize(name)}. Alle Rechte vorbehalten.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group --></div>
<!-- /wp:group --></footer>
<!-- /wp:group -->
`)

  // Blocks schreiben (block.json, index.js, style.scss, editor.scss)
  for (const [blockName, template] of Object.entries(WP_BLOCKS)) {
    const blockDir = path.join(themePath, 'src', 'blocks', blockName)

    // block.json
    const blockJson = {
      $schema: 'https://schemas.wp.org/trunk/block.json',
      apiVersion: 3,
      name: `${slug}/${blockName}`,
      title: template.title,
      icon: template.icon || 'block-default',
      description: template.description || '',
      category: slug,
      attributes: template.attributes,
      editorScript: 'file:./index.js',
      editorStyle: 'file:./index.css',
      style: 'file:./style-index.css',
    }
    if (template.example) blockJson.example = template.example
    fs.writeFileSync(path.join(blockDir, 'block.json'), JSON.stringify(blockJson, null, 2) + '\n')

    // index.js (edit-only, save → null)
    fs.writeFileSync(path.join(blockDir, 'index.js'), template.indexJs.replace(/SLUG/g, slug))

    // style.scss
    fs.writeFileSync(path.join(blockDir, 'style.scss'), template.styleScss.replace(/SLUG/g, slug))

    // editor.scss — importiert shared Editor-Styles
    fs.writeFileSync(path.join(blockDir, 'editor.scss'), `@use '../../scss/editor';
`)
  }

  // Render PHP files (includes/render-*.php)
  for (const [blockName, template] of Object.entries(WP_BLOCKS)) {
    fs.writeFileSync(
      path.join(themePath, 'includes', `render-${blockName}.php`),
      template.renderPhp.replace(/SLUG/g, slug)
    )
  }

  return { success: true, output: `Theme-Scaffold mit ${Object.keys(WP_BLOCKS).length} vorgebauten Blocks generiert` }
}
