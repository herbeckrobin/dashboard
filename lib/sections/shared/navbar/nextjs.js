// Next.js Navbar Komponente

export default {
  tsx: `'use client'
import { useState, useEffect } from 'react'
import './styles.scss'

export default function Navbar({ siteName, sections = [], navStyle = 'glass' }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navItems = sections
    .filter(s => ['features', 'services', 'about', 'gallery', 'faq', 'contact'].includes(s.type))
    .map(s => ({
      label: s.data?.title || s.type.charAt(0).toUpperCase() + s.type.slice(1),
      type: s.type,
    }))

  return (
    <nav className={\`navbar navbar--\${navStyle} \${scrolled ? 'navbar--scrolled' : ''}\`}>
      <div className="navbar__inner">
        <a href="/" className="navbar__logo">{siteName}</a>
        <div className="navbar__links">
          {navItems.map((item, i) => (
            <a key={i} href={item.type === 'contact' ? '#kontakt' : \`#\${item.type}\`} className="navbar__link">
              {item.label}
            </a>
          ))}
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="navbar__burger" aria-label="Menu">
          <span className={\`navbar__burger-line \${menuOpen ? 'navbar__burger-line--open' : ''}\`} />
        </button>
      </div>
      <div className={\`navbar__mobile \${menuOpen ? 'navbar__mobile--open' : ''}\`}>
        {navItems.map((item, i) => (
          <a key={i} href={item.type === 'contact' ? '#kontakt' : \`#\${item.type}\`} onClick={() => setMenuOpen(false)} className="navbar__mobile-link">
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  )
}
`,
  scss: `@use '../../styles/variables' as *;
@use '../../styles/mixins' as *;

.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  transition: background $transition-base, box-shadow $transition-base, border-color $transition-base;

  // === Variant: glass (default) ===
  &--glass {
    background: rgba(255,255,255,0.7);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(0,0,0,0.04);

    &.navbar--scrolled {
      background: rgba(255,255,255,0.92);
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      border-color: transparent;
    }
  }

  // === Variant: solid ===
  &--solid {
    background: $bg;
    border-bottom: 1px solid $border;
  }

  // === Variant: minimal ===
  &--minimal {
    background: transparent;
    border-bottom: none;

    &.navbar--scrolled {
      background: $bg;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }
  }

  // === Variant: transparent ===
  &--transparent {
    background: transparent;
    border-bottom: none;

    .navbar__logo,
    .navbar__link { color: $text-inverted; }
    .navbar__link:hover { color: $text-inverted; }
    .navbar__burger-line,
    .navbar__burger-line::before,
    .navbar__burger-line::after { background: $text-inverted; }

    &.navbar--scrolled {
      background: $bg;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      .navbar__logo,
      .navbar__link { color: $text; }
      .navbar__link:hover { color: $text; }
      .navbar__burger-line,
      .navbar__burger-line::before,
      .navbar__burger-line::after { background: $text; }
    }
  }

  &__inner {
    @include container;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 4rem;
  }

  &__logo {
    font-weight: 800;
    font-size: 1.2rem;
    color: $text;
    text-decoration: none;
    letter-spacing: -0.02em;
  }

  &__links {
    display: none;
    align-items: center;
    gap: 2rem;
    @include respond-to(md) { display: flex; }
  }

  &__link {
    position: relative;
    font-size: 0.875rem;
    color: $text-muted;
    text-decoration: none;
    padding: 0.25rem 0;
    transition: color $transition-fast;

    &::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      width: 0;
      height: 2px;
      background: $primary;
      border-radius: 1px;
      transition: width $transition-base;
    }

    &:hover {
      color: $text;
      &::after { width: 100%; }
    }
  }

  // Hamburger
  &__burger {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    background: none;
    border: none;
    cursor: pointer;
    @include respond-to(md) { display: none; }
  }

  &__burger-line {
    position: relative;
    width: 1.25rem;
    height: 2px;
    background: $text;
    border-radius: 1px;
    transition: background $transition-fast;

    &::before, &::after {
      content: '';
      position: absolute;
      left: 0;
      width: 100%;
      height: 2px;
      background: $text;
      border-radius: 1px;
      transition: transform $transition-base;
    }
    &::before { top: -6px; }
    &::after { top: 6px; }

    &--open {
      background: transparent;
      &::before { transform: translateY(6px) rotate(45deg); }
      &::after { transform: translateY(-6px) rotate(-45deg); }
    }
  }

  // Mobile Menu
  &__mobile {
    max-height: 0;
    overflow: hidden;
    background: $bg;
    transition: max-height 400ms cubic-bezier(0.16, 1, 0.3, 1);
    @include respond-to(md) { display: none; }

    &--open {
      max-height: 400px;
    }
  }

  &__mobile-link {
    display: block;
    padding: 0.75rem 1.5rem;
    color: $text;
    text-decoration: none;
    font-size: 0.95rem;
    border-top: 1px solid $border;
    transition: background $transition-fast, color $transition-fast;

    &:hover {
      background: $surface;
      color: $text;
    }
  }
}
`,
}
