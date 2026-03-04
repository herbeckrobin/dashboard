// Next.js Komponente: Faq

export default {
  tsx: `'use client'
import { useState } from 'react'
import './styles.scss'
import ScrollReveal from '@/components/scroll-reveal/ScrollReveal'

export default function Faq({ data, id, style: sectionStyle }) {
  const { title, items = [] } = data
  const [open, setOpen] = useState(null)
  const cssVars = {}
  if (sectionStyle?.background) cssVars['--section-bg'] = sectionStyle.background
  if (sectionStyle?.text) cssVars['--section-text'] = sectionStyle.text
  if (sectionStyle?.textMuted) cssVars['--section-text-muted'] = sectionStyle.textMuted

  return (
    <section id={id} className="section-faq" style={cssVars}>
      <div className="section-faq__container">
        {title && (
          <ScrollReveal>
            <h2 className="section-faq__title">{title}</h2>
          </ScrollReveal>
        )}
        <div className="section-faq__list">
          {items.map((item, i) => (
            <ScrollReveal key={i} delay={i * 60}>
              <div className={\`section-faq__item \${open === i ? 'section-faq__item--open' : ''}\`}>
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="section-faq__question"
                >
                  <span>{item.question}</span>
                  <span className="section-faq__chevron">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </button>
                <div className="section-faq__answer">
                  <div className="section-faq__answer-inner">{item.answer}</div>
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

.section-faq {
  @include section-base;
  background: var(--section-bg, $surface);

  &__container {
    @include container($container-narrow);
  }

  &__title {
    font-size: clamp(1.75rem, 3vw, 2.5rem);
    font-weight: 700;
    text-align: center;
    color: var(--section-text, $text);
    margin-bottom: 3.5rem;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__item {
    border-radius: 1rem;
    border: 1px solid $border;
    background: $bg;
    overflow: hidden;
    transition: border-color $transition-base, box-shadow $transition-base;

    &:hover {
      border-color: rgba($primary-rgb, 0.15);
    }

    &--open {
      border-color: rgba($primary-rgb, 0.25);
      box-shadow: 0 4px 16px rgba($primary-rgb, 0.06);
    }
  }

  &__question {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    font-weight: 500;
    color: var(--section-text, $text);
    font-size: 1rem;
    gap: 1rem;
  }

  &__chevron {
    color: $text-muted;
    transition: transform $transition-base;
    flex-shrink: 0;

    .section-faq__item--open & {
      transform: rotate(180deg);
      color: $primary;
    }
  }

  &__answer {
    max-height: 0;
    overflow: hidden;
    transition: max-height 400ms cubic-bezier(0.16, 1, 0.3, 1);

    .section-faq__item--open & {
      max-height: 500px;
    }
  }

  &__answer-inner {
    padding: 0 1.5rem 1.25rem;
    color: var(--section-text-muted, $text-muted);
    line-height: 1.75;
    font-size: 0.95rem;
  }
}
`,
}
