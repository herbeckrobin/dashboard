// Zentrale Section-Definitionen (Schema + Data-Mapping)
// Wird von AI-Prompt-Generator, Setup-PHP, Setup-SQL und Validierung genutzt

export const SECTION_SCHEMAS = {
  hero: {
    title: 'Hero Section',
    description: 'Hauptbereich mit Titel und Call-to-Action',
    rexMapping: { 1: 'title', 2: 'subtitle', 3: 'ctaText' },
    promptFragment: `- hero: Hauptbereich mit Titel und Call-to-Action
  Data: { title: string, subtitle: string, ctaText: string }`,
  },
  features: {
    title: 'Features',
    description: 'Feature-Karten in einem Grid',
    rexMapping: { 1: 'title', 2: 'items' },
    promptFragment: `- features: Feature-Karten in einem Grid
  Data: { title: string, items: [{ icon: string (Emoji), title: string, text: string }] } (3-6 Items)`,
  },
  about: {
    title: 'Ueber uns',
    description: 'Ueber-uns Bereich mit Text und Highlights',
    rexMapping: { 1: 'title', 2: 'text', 3: 'highlights' },
    promptFragment: `- about: Ueber-uns Bereich mit Text und Highlights
  Data: { title: string, text: string, highlights: [string] } (3-6 Highlights)`,
  },
  services: {
    title: 'Dienstleistungen',
    description: 'Dienstleistungs-Karten',
    rexMapping: { 1: 'title', 2: 'items' },
    promptFragment: `- services: Dienstleistungs-Karten
  Data: { title: string, items: [{ icon: string (Emoji), title: string, text: string }] } (3-6 Items)`,
  },
  stats: {
    title: 'Statistiken',
    description: 'Zahlen und Statistiken',
    rexMapping: { 1: 'items' },
    promptFragment: `- stats: Zahlen und Statistiken
  Data: { items: [{ value: string, label: string }] } (3-4 Items)`,
  },
  testimonials: {
    title: 'Kundenstimmen',
    description: 'Kundenstimmen',
    rexMapping: { 1: 'items' },
    promptFragment: `- testimonials: Kundenstimmen
  Data: { items: [{ quote: string, author: string, role: string }] } (2-4 Items)`,
  },
  gallery: {
    title: 'Galerie/Portfolio',
    description: 'Portfolio oder Galerie',
    rexMapping: { 1: 'title', 2: 'items' },
    promptFragment: `- gallery: Portfolio oder Galerie
  Data: { title: string, items: [{ title: string, description: string }] } (4-8 Items)`,
  },
  faq: {
    title: 'FAQ',
    description: 'Haeufig gestellte Fragen',
    rexMapping: { 1: 'title', 2: 'items' },
    promptFragment: `- faq: Haeufig gestellte Fragen
  Data: { title: string, items: [{ question: string, answer: string }] } (4-8 Items)`,
  },
  contact: {
    title: 'Kontakt',
    description: 'Kontaktinformationen',
    rexMapping: { 1: 'title', 2: 'phone', 3: 'email', 4: 'address' },
    promptFragment: `- contact: Kontaktinformationen
  Data: { title: string, phone: string, email: string, address: string }`,
  },
  cta: {
    title: 'Call to Action',
    description: 'Call-to-Action Banner',
    rexMapping: { 1: 'title', 2: 'subtitle', 3: 'ctaText' },
    promptFragment: `- cta: Call-to-Action Banner
  Data: { title: string, subtitle: string, ctaText: string }`,
  },
}

// Erzeugt REX_VALUE-Mapping aus Section-Daten (fuer setup-php.js + setup-sql.js)
export function sectionToValues(section) {
  const schema = SECTION_SCHEMAS[section.type]
  if (!schema) return {}
  const data = section.data || {}
  const values = {}
  for (const [rexIdx, fieldName] of Object.entries(schema.rexMapping)) {
    let val = data[fieldName]
    if (Array.isArray(val)) {
      // MForm-Repeater erwartet Array von Objekten mit Feldnamen als Keys
      // Konvertiere plain Strings zu {text: "..."} (z.B. about.highlights)
      val = val.map(item => typeof item === 'string' ? { text: item } : item)
      values[rexIdx] = JSON.stringify(val)
    } else {
      values[rexIdx] = val || ''
    }
  }
  return values
}

// Erzeugt den VERFUEGBARE SECTIONS Block fuer AI-Prompts
export function buildSectionsPrompt() {
  return Object.values(SECTION_SCHEMAS)
    .map(s => s.promptFragment)
    .join('\n')
}

export const VALID_SECTION_TYPES = Object.keys(SECTION_SCHEMAS)
