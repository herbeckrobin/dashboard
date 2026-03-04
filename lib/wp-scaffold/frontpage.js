import { WP_BLOCKS } from '../sections/index.js'

// ============================================================
// FRONTPAGE HTML GENERATOR (fuer ai-generate.js)
// ============================================================

export function generateFrontpageHtml(slug, sections) {
  const spacer = `<!-- wp:spacer {"height":"var:preset|spacing|50"} -->\n<div style="height:var(--wp--preset--spacing--50)" aria-hidden="true" class="wp-block-spacer"></div>\n<!-- /wp:spacer -->`

  const blocks = sections.map(section => {
    const blockName = section.type
    if (!WP_BLOCKS[blockName]) return null

    // Block-Attribute aus section.data aufbauen
    const attrs = {}
    for (const [key, val] of Object.entries(section.data || {})) {
      if (Array.isArray(val)) {
        attrs[key] = JSON.stringify(val)
      } else if (val !== undefined && val !== null) {
        attrs[key] = String(val)
      }
    }

    // Dynamic Block → self-closing comment
    return `<!-- wp:${slug}/${blockName} ${JSON.stringify(attrs)} /-->`
  }).filter(Boolean)

  return blocks.join('\n' + spacer + '\n') + '\n'
}
