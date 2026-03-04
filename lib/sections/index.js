// Section-Registry: Zentrale Imports aller Section-Definitionen
// Importiert jeden Section-Type und aggregiert zu Framework-spezifischen Maps

import { SECTION_SCHEMAS, sectionToValues, buildSectionsPrompt, VALID_SECTION_TYPES } from './schema.js'

import * as hero from './hero/index.js'
import * as features from './features/index.js'
import * as about from './about/index.js'
import * as services from './services/index.js'
import * as stats from './stats/index.js'
import * as testimonials from './testimonials/index.js'
import * as gallery from './gallery/index.js'
import * as faq from './faq/index.js'
import * as contact from './contact/index.js'
import * as cta from './cta/index.js'

const ALL_SECTIONS = { hero, features, about, services, stats, testimonials, gallery, faq, contact, cta }

// WordPress Blocks Map (Ersetzt WP_BLOCKS aus blocks.js)
export const WP_BLOCKS = Object.fromEntries(
  Object.entries(ALL_SECTIONS).map(([name, sec]) => [name, sec.wp])
)

// Redaxo Modules Map (Ersetzt REDAXO_MODULES aus modules.js)
export const REDAXO_MODULES = Object.fromEntries(
  Object.entries(ALL_SECTIONS).map(([name, sec]) => [name, sec.redaxo])
)

// Next.js Section Components Map (Ersetzt SECTION_COMPONENTS — Keys mit Grossbuchstaben)
export const SECTION_COMPONENTS = Object.fromEntries(
  Object.entries(ALL_SECTIONS).map(([name, sec]) => {
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1)
    return [capitalized, sec.nextjs]
  })
)

// Redaxo per-section CSS Map
export const SECTION_CSS = Object.fromEntries(
  Object.entries(ALL_SECTIONS)
    .filter(([, sec]) => sec.css)
    .map(([name, sec]) => [name, sec.css])
)

// Shared Next.js Components (Navbar, Footer, ScrollReveal, Styles)
export { default as NAVBAR } from './shared/navbar/nextjs.js'
export { default as FOOTER } from './shared/footer/nextjs.js'
export { default as SCROLL_REVEAL } from './shared/scroll-reveal/nextjs.js'
export { default as SHARED_STYLES } from './shared/styles/nextjs.js'

// Schema-Utilities re-exportieren
export { SECTION_SCHEMAS, sectionToValues, buildSectionsPrompt, VALID_SECTION_TYPES }
