// Next.js Komponente: Testimonials

export default {
  tsx: `import './styles.scss'
import ScrollReveal from '@/components/scroll-reveal/ScrollReveal'

export default function Testimonials({ data, id, style: sectionStyle }) {
  const { items = [] } = data
  const cssVars = {}
  if (sectionStyle?.background) cssVars['--section-bg'] = sectionStyle.background
  if (sectionStyle?.text) cssVars['--section-text'] = sectionStyle.text
  if (sectionStyle?.textMuted) cssVars['--section-text-muted'] = sectionStyle.textMuted

  return (
    <section id={id} className="section-testimonials" style={cssVars}>
      <div className="section-testimonials__container">
        <div className="section-testimonials__grid">
          {items.map((item, i) => (
            <ScrollReveal key={i} delay={i * 120} direction={i % 2 === 0 ? 'left' : 'right'}>
              <blockquote className="section-testimonials__card">
                <span className="section-testimonials__quote-mark">&ldquo;</span>
                <p className="section-testimonials__text">{item.quote}</p>
                <footer className="section-testimonials__footer">
                  <div className="section-testimonials__avatar">
                    {item.author?.[0]}
                  </div>
                  <div>
                    <div className="section-testimonials__author">{item.author}</div>
                    {item.role && <div className="section-testimonials__role">{item.role}</div>}
                  </div>
                </footer>
              </blockquote>
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

.section-testimonials {
  @include section-base;
  background: var(--section-bg, $surface);

  &__container { @include container; }

  &__grid {
    display: grid;
    gap: 2rem;
    @include respond-to(md) { grid-template-columns: repeat(2, 1fr); }
  }

  &__card {
    position: relative;
    padding: 2.5rem 2rem 2rem;
    border-radius: 1.25rem;
    background: $bg;
    border: 1px solid $border;
    transition: box-shadow $transition-base;

    &:hover {
      box-shadow: $shadow-card;
    }
  }

  &__quote-mark {
    position: absolute;
    top: 0.75rem;
    left: 1.25rem;
    font-size: 4rem;
    line-height: 1;
    color: rgba($primary-rgb, 0.1);
    font-family: Georgia, serif;
    pointer-events: none;
  }

  &__text {
    color: var(--section-text, $text);
    line-height: 1.75;
    font-style: italic;
    margin-bottom: 1.5rem;
    position: relative;
    z-index: 1;
  }

  &__footer {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  &__avatar {
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 50%;
    background: rgba($primary-rgb, 0.08);
    color: $primary;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1rem;
  }

  &__author {
    font-weight: 600;
    color: var(--section-text, $text);
    font-size: 0.9rem;
  }

  &__role {
    color: var(--section-text-muted, $text-muted);
    font-size: 0.8rem;
  }
}
`,
}
