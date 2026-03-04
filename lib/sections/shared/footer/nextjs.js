// Next.js Footer Komponente

export default {
  tsx: `import './styles.scss'

export default function Footer({ siteName, sections = [], footerStyle = 'dark' }) {
  const navItems = sections
    .filter(s => ['features', 'services', 'about', 'gallery', 'faq', 'contact'].includes(s.type))
    .map(s => ({
      label: s.data?.title || s.type.charAt(0).toUpperCase() + s.type.slice(1),
      type: s.type,
    }))

  return (
    <footer className={\`site-footer site-footer--\${footerStyle}\`}>
      <div className="site-footer__gradient-line" />
      <div className="site-footer__container">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <span className="site-footer__logo">{siteName}</span>
            <p className="site-footer__tagline">Qualitaet und Zuverlaessigkeit seit Jahren.</p>
          </div>
          {navItems.length > 0 && (
            <div className="site-footer__nav">
              <h4 className="site-footer__nav-title">Navigation</h4>
              <ul className="site-footer__nav-list">
                {navItems.map((item, i) => (
                  <li key={i}>
                    <a href={item.type === 'contact' ? '#kontakt' : \`#\${item.type}\`} className="site-footer__nav-link">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="site-footer__bottom">
          <p>&copy; {new Date().getFullYear()} {siteName}. Alle Rechte vorbehalten.</p>
        </div>
      </div>
    </footer>
  )
}
`,
  scss: `@use '../../styles/variables' as *;
@use '../../styles/mixins' as *;

.site-footer {
  position: relative;

  // === Variant: dark (default) ===
  &--dark {
    background: linear-gradient(to bottom, #111827, #0f172a);
    color: #9ca3af;
    .site-footer__logo { color: white; }
    .site-footer__nav-title { color: white; }
    .site-footer__nav-link { color: #9ca3af; &:hover { color: white; } }
    .site-footer__bottom { border-top-color: rgba(255,255,255,0.08); }
  }

  // === Variant: minimal ===
  &--minimal {
    background: $surface;
    color: $text-muted;
    .site-footer__gradient-line { display: none; }
    .site-footer__logo { color: $text; }
    .site-footer__nav-title { color: $text; }
    .site-footer__nav-link { color: $text-muted; &:hover { color: $text; } }
    .site-footer__bottom { border-top-color: $border; }
  }

  // === Variant: accent ===
  &--accent {
    background: $primary;
    color: rgba(255,255,255,0.8);
    .site-footer__gradient-line { display: none; }
    .site-footer__logo { color: white; }
    .site-footer__nav-title { color: white; }
    .site-footer__nav-link { color: rgba(255,255,255,0.7); &:hover { color: white; } }
    .site-footer__bottom { border-top-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.6); }
  }

  &__gradient-line {
    height: 3px;
    background: linear-gradient(90deg, $primary, $secondary, $primary);
    background-size: 200% 100%;
    animation: gradient-shift 6s ease infinite;
  }

  &__container {
    @include container;
    padding-top: 3rem;
    padding-bottom: 2rem;
  }

  &__grid {
    display: grid;
    gap: 2rem;
    margin-bottom: 2rem;
    @include respond-to(md) { grid-template-columns: 2fr 1fr; }
  }

  &__logo {
    font-weight: 800;
    font-size: 1.2rem;
  }

  &__tagline {
    margin-top: 0.5rem;
    font-size: 0.9rem;
  }

  &__nav-title {
    font-weight: 600;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.75rem;
  }

  &__nav-list {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  &__nav-link {
    text-decoration: none;
    font-size: 0.9rem;
    transition: color $transition-fast;
  }

  &__bottom {
    padding-top: 1.5rem;
    border-top: 1px solid;
    font-size: 0.8rem;
    text-align: center;
  }
}
`,
}
