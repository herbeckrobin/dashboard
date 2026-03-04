// Next.js Komponente: Features

export default {
  tsx: `import './styles.scss'
import ScrollReveal from '@/components/scroll-reveal/ScrollReveal'

export default function Features({ data, id, style: sectionStyle }) {
  const { title, items = [] } = data
  const cssVars = {}
  if (sectionStyle?.background) cssVars['--section-bg'] = sectionStyle.background
  if (sectionStyle?.text) cssVars['--section-text'] = sectionStyle.text
  if (sectionStyle?.textMuted) cssVars['--section-text-muted'] = sectionStyle.textMuted

  return (
    <section id={id} className="section-features" style={cssVars}>
      <div className="section-features__container">
        {title && (
          <ScrollReveal>
            <h2 className="section-features__title">{title}</h2>
          </ScrollReveal>
        )}
        <div className="section-features__grid">
          {items.map((item, i) => (
            <ScrollReveal key={i} delay={i * 100}>
              <div className="section-features__card">
                {item.icon && (
                  <div className="section-features__icon">{item.icon}</div>
                )}
                <h3 className="section-features__card-title">{item.title}</h3>
                <p className="section-features__card-text">{item.text}</p>
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

.section-features {
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
    padding: 2rem;
    border-radius: 1rem;
    border: 1px solid $border;
    background: $surface;
    @include card-hover;

    &:hover {
      border-color: rgba($primary-rgb, 0.2);
    }

    &:hover .section-features__icon {
      transform: scale(1.1) rotate(-3deg);
    }
  }

  &__icon {
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    background: rgba($primary-rgb, 0.08);
    border-radius: 0.75rem;
    margin-bottom: 1rem;
    transition: transform $transition-base;
  }

  &__card-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--section-text, $text);
    margin-bottom: 0.5rem;
  }

  &__card-text {
    color: var(--section-text-muted, $text-muted);
    line-height: 1.7;
    font-size: 0.95rem;
  }
}
`,
}
