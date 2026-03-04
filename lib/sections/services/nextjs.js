// Next.js Komponente: Services

export default {
  tsx: `import './styles.scss'
import ScrollReveal from '@/components/scroll-reveal/ScrollReveal'

export default function Services({ data, id, style: sectionStyle }) {
  const { title, items = [] } = data
  const cssVars = {}
  if (sectionStyle?.background) cssVars['--section-bg'] = sectionStyle.background
  if (sectionStyle?.text) cssVars['--section-text'] = sectionStyle.text
  if (sectionStyle?.textMuted) cssVars['--section-text-muted'] = sectionStyle.textMuted

  return (
    <section id={id} className="section-services" style={cssVars}>
      <div className="section-services__container">
        {title && (
          <ScrollReveal>
            <h2 className="section-services__title">{title}</h2>
          </ScrollReveal>
        )}
        <div className="section-services__grid">
          {items.map((item, i) => (
            <ScrollReveal key={i} delay={i * 120}>
              <div className="section-services__card">
                <span className="section-services__num">{String(i + 1).padStart(2, '0')}</span>
                {item.icon && (
                  <span className="section-services__icon">{item.icon}</span>
                )}
                <h3 className="section-services__card-title">{item.title}</h3>
                <p className="section-services__card-text">{item.text}</p>
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
@use '../../styles/mixins' as *;

.section-services {
  @include section-base;
  background: var(--section-bg, $bg);

  &__container { @include container; }

  &__title {
    font-size: clamp(1.75rem, 3vw, 2.5rem);
    font-weight: 700;
    text-align: center;
    color: var(--section-text, $text);
    margin-bottom: 3.5rem;
  }

  &__grid {
    display: grid;
    gap: 2rem;
    @include respond-to(sm) { grid-template-columns: repeat(2, 1fr); }
    @include respond-to(lg) { grid-template-columns: repeat(3, 1fr); }
  }

  &__card {
    position: relative;
    padding: 2.5rem 2rem 2rem;
    border-radius: 1.25rem;
    background: $surface;
    border: 2px solid transparent;
    @include card-hover;

    &:hover {
      background: $bg;
      border-color: rgba($primary-rgb, 0.25);
    }
  }

  &__num {
    position: absolute;
    top: 1rem;
    right: 1.25rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: rgba($primary-rgb, 0.25);
    letter-spacing: 0.05em;
  }

  &__icon {
    display: block;
    font-size: 2.25rem;
    margin-bottom: 1.25rem;
  }

  &__card-title {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--section-text, $text);
    margin-bottom: 0.75rem;
  }

  &__card-text {
    color: var(--section-text-muted, $text-muted);
    line-height: 1.7;
    font-size: 0.95rem;
  }
}
`,
}
