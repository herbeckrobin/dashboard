// Next.js Komponente: Stats

export default {
  tsx: `import './styles.scss'
import ScrollReveal from '@/components/scroll-reveal/ScrollReveal'

export default function Stats({ data, id, style: sectionStyle }) {
  const { items = [] } = data
  const cssVars = {}
  if (sectionStyle?.background) {
    cssVars['--section-bg'] = sectionStyle.backgroundEnd
      ? \`linear-gradient(135deg, \${sectionStyle.background} 0%, \${sectionStyle.backgroundEnd} 100%)\`
      : sectionStyle.background
  }
  if (sectionStyle?.text) cssVars['--section-text'] = sectionStyle.text
  if (sectionStyle?.textMuted) cssVars['--section-text-muted'] = sectionStyle.textMuted

  return (
    <section id={id} className="section-stats" style={cssVars}>
      <div className="section-stats__bg" />
      <div className="section-stats__container">
        <div className="section-stats__grid">
          {items.map((item, i) => (
            <ScrollReveal key={i} delay={i * 100} direction="scale">
              <div className="section-stats__item">
                <div className="section-stats__value">{item.value}</div>
                <div className="section-stats__divider" />
                <div className="section-stats__label">{item.label}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
`,
  scss: `@use '../../styles/variables' as *;
@use '../../styles/animations';
@use '../../styles/mixins' as *;

.section-stats {
  @include section-base;
  color: var(--section-text, $text-inverted);

  &__bg {
    position: absolute;
    inset: 0;
    background: var(--section-bg, linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%));
    background-size: 200% 200%;
    animation: gradient-shift 15s ease infinite;
  }

  &__container { @include container; position: relative; z-index: 1; }

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
    text-align: center;
    @include respond-to(lg) { grid-template-columns: repeat(4, 1fr); }
  }

  &__item {
    padding: 1.5rem;
  }

  &__value {
    font-size: clamp(2rem, 4vw, 2.75rem);
    font-weight: 800;
    color: $primary;
    letter-spacing: -0.02em;
  }

  &__divider {
    width: 2rem;
    height: 2px;
    background: rgba($primary-rgb, 0.3);
    margin: 0.75rem auto;
    border-radius: 1px;
  }

  &__label {
    font-size: 0.8rem;
    color: var(--section-text-muted, #9ca3af);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
}
`,
}
