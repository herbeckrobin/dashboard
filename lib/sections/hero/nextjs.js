// Next.js Komponente: Hero

export default {
  tsx: `import './styles.scss'
import ScrollReveal from '@/components/scroll-reveal/ScrollReveal'

export default function Hero({ data, id, style: sectionStyle }) {
  const { title, subtitle, ctaText } = data
  const cssVars = {}
  if (sectionStyle?.background) {
    cssVars['--section-bg'] = sectionStyle.backgroundEnd
      ? \`linear-gradient(135deg, \${sectionStyle.background} 0%, \${sectionStyle.backgroundEnd} 100%)\`
      : sectionStyle.background
  }
  if (sectionStyle?.text) cssVars['--section-text'] = sectionStyle.text
  if (sectionStyle?.textMuted) cssVars['--section-text-muted'] = sectionStyle.textMuted

  return (
    <section id={id} className="section-hero" style={cssVars}>
      <div className="section-hero__bg" />
      <div className="section-hero__orb section-hero__orb--1" />
      <div className="section-hero__orb section-hero__orb--2" />
      <div className="section-hero__content">
        <ScrollReveal>
          <h1 className="section-hero__title">{title}</h1>
        </ScrollReveal>
        {subtitle && (
          <ScrollReveal delay={150}>
            <p className="section-hero__subtitle">{subtitle}</p>
          </ScrollReveal>
        )}
        {ctaText && (
          <ScrollReveal delay={300}>
            <div className="section-hero__cta-wrap">
              <a href="#kontakt" className="section-hero__cta">{ctaText}</a>
            </div>
          </ScrollReveal>
        )}
      </div>
    </section>
  )
}
`,
  scss: `@use '../../styles/variables' as *;
@use '../../styles/animations';
@use '../../styles/mixins' as *;

.section-hero {
  position: relative;
  min-height: 85vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--section-text, $text-inverted);
  overflow: hidden;

  &__bg {
    position: absolute;
    inset: 0;
    background: var(--section-bg, linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0f172a 100%));
    background-size: 200% 200%;
    animation: gradient-shift 12s ease infinite;
  }

  &__orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    pointer-events: none;
    animation: float 6s ease-in-out infinite;

    &--1 {
      width: 400px;
      height: 400px;
      top: -100px;
      right: -100px;
      background: rgba($primary-rgb, 0.15);
    }
    &--2 {
      width: 300px;
      height: 300px;
      bottom: -80px;
      left: -60px;
      background: rgba($secondary-rgb, 0.12);
      animation-delay: -3s;
      animation-name: float-slow;
    }
  }

  &__content {
    position: relative;
    z-index: 1;
    @include container($container-narrow);
    padding: $section-padding-y 0;
    text-align: center;
  }

  &__title {
    font-size: clamp(2.25rem, 5vw, 3.75rem);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.02em;
  }

  &__subtitle {
    margin-top: 1.5rem;
    font-size: clamp(1.05rem, 2vw, 1.25rem);
    color: var(--section-text-muted, rgba(255,255,255,0.7));
    max-width: 36rem;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.7;
  }

  &__cta-wrap {
    margin-top: 2.5rem;
  }

  &__cta {
    display: inline-block;
    padding: 0.9rem 2.5rem;
    background: $primary;
    color: white;
    font-weight: 600;
    border-radius: 0.75rem;
    text-decoration: none;
    transition: transform $transition-fast, box-shadow $transition-fast;
    animation: pulse-glow 3s ease-in-out infinite;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 0 40px rgba($primary-rgb, 0.5);
    }
  }
}
`,
}
