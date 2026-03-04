// Generiert minimale Nav/Footer CSS fuer WordPress Themes
// Nur Effekte die nicht ueber WP Block-Attribute moeglich sind:
// Glass-Navbar, Sticky, Scroll-State, Hover-Underlines, Footer-Gradient, Link-Hover-Transitions
// Farben, Spacing, Typografie → alles ueber WP Block-Attribute im Template-HTML

export function generateNavFooterCSS({ primary, secondary }, isDark = false) {
  return `
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
`
}
