// Next.js Shared SCSS Styles

export default {
  _variables: `// Theme-Farben (werden von globals.scss via CSS Custom Properties gesetzt)
$primary: rgb(var(--color-primary));
$secondary: rgb(var(--color-secondary));
$primary-rgb: var(--color-primary);
$secondary-rgb: var(--color-secondary);

// Design-Token Variablen (referenzieren CSS Custom Properties aus globals.scss)
$bg: var(--color-bg);
$surface: var(--color-surface);
$surface-alt: var(--color-surface-alt);
$text: var(--color-text);
$text-muted: var(--color-text-muted);
$text-inverted: var(--color-text-inverted);
$accent: var(--color-accent);
$border: var(--color-border);

// Spacing
$section-padding-y: clamp(4rem, 8vw, 7rem);
$section-padding-y-lg: clamp(6rem, 12vw, 10.5rem);
$section-padding-x: 1.5rem;
$container-max: 72rem;
$container-narrow: 48rem;

// Typography
$font-heading: var(--font-body);
$font-body: var(--font-body);

// Transitions
$transition-fast: 200ms ease;
$transition-base: 300ms ease;
$transition-slow: 500ms ease;
$transition-reveal: 700ms cubic-bezier(0.16, 1, 0.3, 1);

// Shadows
$shadow-card: 0 4px 24px rgba(0, 0, 0, 0.06);
$shadow-card-hover: 0 12px 40px rgba(0, 0, 0, 0.12);
$shadow-glow: 0 0 30px rgba($primary-rgb, 0.3);
`,

  _animations: `// Keyframes fuer Scroll-Reveal und Deko-Elemente
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(2rem); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeInLeft {
  from { opacity: 0; transform: translateX(-2rem); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes fadeInRight {
  from { opacity: 0; transform: translateX(2rem); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}
@keyframes float-slow {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-8px) rotate(3deg); }
}
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(var(--color-primary), 0.25); }
  50% { box-shadow: 0 0 50px rgba(var(--color-primary), 0.45); }
}
@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`,

  _mixins: `@use 'variables' as *;

@mixin container($max: $container-max) {
  max-width: $max;
  margin: 0 auto;
  padding: 0 $section-padding-x;
}

@mixin section-base {
  padding: $section-padding-y $section-padding-x;
  position: relative;
  overflow: hidden;
}

@mixin card-hover {
  transition: transform $transition-base, box-shadow $transition-base, border-color $transition-base;
  &:hover {
    transform: translateY(-4px);
    box-shadow: $shadow-card-hover;
  }
}

@mixin respond-to($bp) {
  @if $bp == sm { @media (min-width: 640px) { @content; } }
  @if $bp == md { @media (min-width: 768px) { @content; } }
  @if $bp == lg { @media (min-width: 1024px) { @content; } }
}

// Dekorativer Blob (opacity statt rgba — kompatibel mit CSS Custom Properties)
@mixin deco-blob($size, $color, $opacity: 0.08) {
  content: '';
  position: absolute;
  width: $size;
  height: $size;
  border-radius: 50%;
  background: #{$color};
  opacity: $opacity;
  filter: blur(60px);
  pointer-events: none;
}

// Reveal-Animation (fuer ScrollReveal-gesteuerte Elemente)
.reveal-hidden {
  opacity: 0;
  transform: translateY(2rem);
  transition: opacity $transition-reveal, transform $transition-reveal;
}
.reveal-visible {
  opacity: 1;
  transform: translateY(0);
}
`,
}
