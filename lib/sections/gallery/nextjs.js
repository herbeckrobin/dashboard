// Next.js Komponente: Gallery

export default {
  tsx: `import './styles.scss'
import ScrollReveal from '@/components/scroll-reveal/ScrollReveal'

export default function Gallery({ data, id, style: sectionStyle }) {
  const { title, items = [] } = data
  const cssVars = {}
  if (sectionStyle?.background) cssVars['--section-bg'] = sectionStyle.background
  if (sectionStyle?.text) cssVars['--section-text'] = sectionStyle.text

  return (
    <section id={id} className="section-gallery" style={cssVars}>
      <div className="section-gallery__container">
        {title && (
          <ScrollReveal>
            <h2 className="section-gallery__title">{title}</h2>
          </ScrollReveal>
        )}
        <div className="section-gallery__grid">
          {items.map((item, i) => (
            <ScrollReveal key={i} delay={i * 80} direction="scale">
              <div className="section-gallery__item">
                <div className="section-gallery__icon-wrap">
                  <span className="section-gallery__icon">{item.icon || '\uD83D\uDDBC'}</span>
                </div>
                <div className="section-gallery__overlay">
                  <h3 className="section-gallery__item-title">{item.title}</h3>
                  {item.description && (
                    <p className="section-gallery__item-desc">{item.description}</p>
                  )}
                </div>
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

.section-gallery {
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
    gap: 1.25rem;
    @include respond-to(sm) { grid-template-columns: repeat(2, 1fr); }
    @include respond-to(lg) { grid-template-columns: repeat(3, 1fr); }
  }

  &__item {
    position: relative;
    aspect-ratio: 4/3;
    border-radius: 1rem;
    overflow: hidden;
    background: $surface-alt;
    cursor: pointer;
  }

  &__icon-wrap {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform $transition-slow;

    .section-gallery__item:hover & {
      transform: scale(1.15);
    }
  }

  &__icon {
    font-size: 3.5rem;
    opacity: 0.25;
  }

  &__overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 50%, transparent 100%);
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 1.5rem;
    opacity: 0.85;
    transition: opacity $transition-base;

    .section-gallery__item:hover & {
      opacity: 1;
    }
  }

  &__item-title {
    color: white;
    font-weight: 600;
    font-size: 1rem;
    margin-bottom: 0.25rem;
  }

  &__item-desc {
    color: rgba(255,255,255,0.7);
    font-size: 0.85rem;
  }
}
`,
}
