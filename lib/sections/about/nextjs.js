// Next.js Komponente: About

export default {
  tsx: `import './styles.scss'
import ScrollReveal from '@/components/scroll-reveal/ScrollReveal'

export default function About({ data, id, style: sectionStyle }) {
  const { title, text, highlights = [] } = data
  const cssVars = {}
  if (sectionStyle?.background) cssVars['--section-bg'] = sectionStyle.background
  if (sectionStyle?.text) cssVars['--section-text'] = sectionStyle.text
  if (sectionStyle?.textMuted) cssVars['--section-text-muted'] = sectionStyle.textMuted

  return (
    <section id={id} className="section-about" style={cssVars}>
      <div className="section-about__blob" />
      <div className="section-about__container">
        <div className="section-about__grid">
          <div className="section-about__text-col">
            {title && (
              <ScrollReveal>
                <h2 className="section-about__title">{title}</h2>
              </ScrollReveal>
            )}
            {text && (
              <ScrollReveal delay={100}>
                <p className="section-about__text">{text}</p>
              </ScrollReveal>
            )}
          </div>
          {highlights.length > 0 && (
            <div className="section-about__highlights-col">
              <ul className="section-about__highlights">
                {highlights.map((item, i) => (
                  <ScrollReveal key={i} delay={150 + i * 80} direction="right">
                    <li className="section-about__highlight">
                      <span className="section-about__dot" />
                      <span>{item}</span>
                    </li>
                  </ScrollReveal>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
`,
  scss: `@use '../../styles/variables' as *;
@use '../../styles/animations';
@use '../../styles/mixins' as *;

.section-about {
  @include section-base;
  background: var(--section-bg, $surface);

  &__blob {
    position: absolute;
    top: -120px;
    right: -120px;
    width: 400px;
    height: 400px;
    border-radius: 50%;
    background: rgba($primary-rgb, 0.05);
    filter: blur(80px);
    pointer-events: none;
  }

  &__container { @include container; position: relative; z-index: 1; }

  &__grid {
    display: grid;
    gap: 3rem;
    align-items: start;
    @include respond-to(md) { grid-template-columns: 1fr 1fr; }
  }

  &__title {
    font-size: clamp(1.75rem, 3vw, 2.5rem);
    font-weight: 700;
    color: var(--section-text, $text);
    margin-bottom: 1.5rem;
  }

  &__text {
    font-size: 1.1rem;
    color: var(--section-text-muted, $text-muted);
    line-height: 1.8;
  }

  &__highlights {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &__highlight {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: $bg;
    border-radius: 0.75rem;
    border: 1px solid $border;
    color: var(--section-text, $text);
    font-size: 0.95rem;
    transition: border-color $transition-base, box-shadow $transition-base;

    &:hover {
      border-color: rgba($primary-rgb, 0.2);
      box-shadow: $shadow-card;
    }
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: $primary;
    flex-shrink: 0;
  }
}
`,
}
