// Shared Theme-Defaults und Font-Pairings fuer WP + Redaxo + Next.js Scaffolds

// Kuratierte Google-Font-Paarungen (Heading + Body)
// AI waehlt basierend auf Projektbeschreibung
export const FONT_PAIRINGS = {
  inter: {
    label: 'Inter (Modern, clean — SaaS, Startups)',
    heading: '"Inter", system-ui, sans-serif',
    body: '"Inter", system-ui, sans-serif',
    google: 'family=Inter:wght@400;500;600;700;800',
  },
  'playfair-lora': {
    label: 'Playfair Display + Lora (Elegant, klassisch — Restaurants, Kanzleien)',
    heading: '"Playfair Display", Georgia, serif',
    body: '"Lora", Georgia, serif',
    google: 'family=Lora:ital,wght@0,400;0,600;1,400&family=Playfair+Display:wght@700;800;900',
  },
  'dm-serif-source': {
    label: 'DM Serif Display + Source Serif 4 (Modern-klassisch — Architekten, Immobilien)',
    heading: '"DM Serif Display", Georgia, serif',
    body: '"Source Serif 4", Georgia, serif',
    google: 'family=DM+Serif+Display&family=Source+Serif+4:wght@400;600',
  },
  jetbrains: {
    label: 'JetBrains Mono (Technisch — Developer, Code)',
    heading: '"JetBrains Mono", monospace',
    body: '"JetBrains Mono", monospace',
    google: 'family=JetBrains+Mono:wght@400;500;700',
  },
  poppins: {
    label: 'Poppins (Freundlich, geometrisch — Agenturen, Bildung)',
    heading: '"Poppins", sans-serif',
    body: '"Poppins", sans-serif',
    google: 'family=Poppins:wght@400;500;600;700;800',
  },
  'raleway-merriweather': {
    label: 'Raleway + Merriweather (Elegant-modern — Beratung, Premium)',
    heading: '"Raleway", sans-serif',
    body: '"Merriweather", Georgia, serif',
    google: 'family=Merriweather:wght@400;700&family=Raleway:wght@600;700;800',
  },
  'space-grotesk': {
    label: 'Space Grotesk (Geometrisch, futuristisch — Fintech, Crypto)',
    heading: '"Space Grotesk", system-ui, sans-serif',
    body: '"Space Grotesk", system-ui, sans-serif',
    google: 'family=Space+Grotesk:wght@400;500;600;700',
  },
  outfit: {
    label: 'Outfit (Sauber, vielseitig — Handwerk, KMU)',
    heading: '"Outfit", system-ui, sans-serif',
    body: '"Outfit", system-ui, sans-serif',
    google: 'family=Outfit:wght@400;500;600;700;800',
  },
  system: {
    label: 'System-Font (Keine Ladezeit, neutral)',
    heading: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    body: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    google: null,
  },
}

// Google Fonts URL aus Pairing-Config generieren
export function getGoogleFontsUrl(fontKey) {
  const config = FONT_PAIRINGS[fontKey]
  if (!config?.google) return null
  return `https://fonts.googleapis.com/css2?${config.google}&display=swap`
}

// Font-Config aus Key holen (mit Fallback auf system)
export function getFontConfig(fontKey) {
  return FONT_PAIRINGS[fontKey] || FONT_PAIRINGS.system
}

// Compat: FONT_STACKS (body-Font aus FONT_PAIRINGS)
export const FONT_STACKS = Object.fromEntries(
  Object.entries(FONT_PAIRINGS).map(([key, cfg]) => [key, cfg.body])
)

// Alle validen Font-Keys
export const VALID_FONT_KEYS = Object.keys(FONT_PAIRINGS)

export function getThemeDefaults(mode) {
  if (mode === 'dark') {
    return {
      bg: '#0a0a0a', surface: '#1a1a2e', surfaceAlt: '#16213e',
      text: '#f5f5f5', textMuted: '#9ca3af', textInverted: '#111827',
      border: '#2a2a3e',
    }
  }
  return {
    bg: '#ffffff', surface: '#f9fafb', surfaceAlt: '#f3f4f6',
    text: '#111827', textMuted: '#6b7280', textInverted: '#ffffff',
    border: '#e5e7eb',
  }
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function phpNamespace(name) {
  return capitalize(name.replace(/-/g, '_'))
}
