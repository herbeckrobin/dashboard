// Next.js Komponente: Contact

export default {
  tsx: `import './styles.scss'
import ScrollReveal from '@/components/scroll-reveal/ScrollReveal'

export default function Contact({ data, id, style: sectionStyle }) {
  const { title, phone, email, address } = data
  const cssVars = {}
  if (sectionStyle?.background) cssVars['--section-bg'] = sectionStyle.background
  if (sectionStyle?.text) cssVars['--section-text'] = sectionStyle.text
  if (sectionStyle?.textMuted) cssVars['--section-text-muted'] = sectionStyle.textMuted

  return (
    <section id={id || 'kontakt'} className="section-contact" style={cssVars}>
      <div className="section-contact__container">
        {title && (
          <ScrollReveal>
            <h2 className="section-contact__title">{title}</h2>
          </ScrollReveal>
        )}
        <div className="section-contact__grid">
          {phone && (
            <ScrollReveal delay={100}>
              <a href={\`tel:\${phone.replace(/\\s/g, '')}\`} className="section-contact__card">
                <span className="section-contact__icon">\uD83D\uDCDE</span>
                <span className="section-contact__label">Telefon</span>
                <span className="section-contact__value">{phone}</span>
              </a>
            </ScrollReveal>
          )}
          {email && (
            <ScrollReveal delay={200}>
              <a href={\`mailto:\${email}\`} className="section-contact__card">
                <span className="section-contact__icon">\u2709\uFE0F</span>
                <span className="section-contact__label">E-Mail</span>
                <span className="section-contact__value">{email}</span>
              </a>
            </ScrollReveal>
          )}
          {address && (
            <ScrollReveal delay={300}>
              <div className="section-contact__card">
                <span className="section-contact__icon">\uD83D\uDCCD</span>
                <span className="section-contact__label">Adresse</span>
                <span className="section-contact__value">{address}</span>
              </div>
            </ScrollReveal>
          )}
        </div>
      </div>
    </section>
  )
}
`,
  scss: `@use '../../styles/variables' as *;
@use '../../styles/mixins' as *;

.section-contact {
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
    gap: 1.5rem;
    max-width: 48rem;
    margin: 0 auto;
    @include respond-to(sm) { grid-template-columns: repeat(2, 1fr); }
    @include respond-to(lg) { grid-template-columns: repeat(3, 1fr); }
  }

  &__card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 2rem 1.5rem;
    border-radius: 1rem;
    border: 1px solid $border;
    text-decoration: none;
    color: inherit;
    background: $surface;
    @include card-hover;

    &:hover {
      border-color: rgba($primary-rgb, 0.25);
    }

    &:hover .section-contact__icon {
      transform: scale(1.15);
    }
  }

  &__icon {
    font-size: 2rem;
    margin-bottom: 0.75rem;
    transition: transform $transition-base;
  }

  &__label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--section-text-muted, $text-muted);
    margin-bottom: 0.5rem;
  }

  &__value {
    font-weight: 500;
    color: var(--section-text, $text);
    font-size: 0.95rem;
  }
}
`,
}
