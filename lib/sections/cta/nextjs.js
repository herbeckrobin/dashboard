// Next.js Komponente: Cta

export default {
  tsx: `import './styles.scss'
import ScrollReveal from '@/components/scroll-reveal/ScrollReveal'

export default function Cta({ data, id, style: sectionStyle }) {
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
    <section id={id} className="section-cta" style={cssVars}>
      <div className="section-cta__bg" />
      <div className="section-cta__orb" />
      <div className="section-cta__container">
        <ScrollReveal>
          <h2 className="section-cta__title">{title}</h2>
        </ScrollReveal>
        {subtitle && (
          <ScrollReveal delay={100}>
            <p className="section-cta__subtitle">{subtitle}</p>
          </ScrollReveal>
        )}
        {ctaText && (
          <ScrollReveal delay={200}>
            <a href="#kontakt" className="section-cta__button">{ctaText}</a>
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

.section-cta {
  @include section-base;
  text-align: center;
  color: var(--section-text, $text-inverted);

  &__bg {
    position: absolute;
    inset: 0;
    background: var(--section-bg, linear-gradient(135deg, $primary 0%, $secondary 100%));
    background-size: 200% 200%;
    animation: gradient-shift 10s ease infinite;
  }

  &__orb {
    position: absolute;
    width: 300px;
    height: 300px;
    border-radius: 50%;
    background: rgba(255,255,255,0.08);
    top: -80px;
    right: -60px;
    filter: blur(40px);
    animation: float-slow 8s ease-in-out infinite;
    pointer-events: none;
  }

  &__container {
    @include container($container-narrow);
    position: relative;
    z-index: 1;
  }

  &__title {
    font-size: clamp(1.75rem, 3.5vw, 2.5rem);
    font-weight: 700;
    margin-bottom: 1rem;
  }

  &__subtitle {
    font-size: 1.1rem;
    color: var(--section-text-muted, rgba(255,255,255,0.8));
    margin-bottom: 2rem;
  }

  &__button {
    display: inline-block;
    padding: 0.9rem 2.5rem;
    background: $bg;
    color: $text;
    font-weight: 600;
    border-radius: 0.75rem;
    text-decoration: none;
    transition: transform $transition-fast, box-shadow $transition-fast;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(0,0,0,0.2);
    }
  }
}
`,
}
