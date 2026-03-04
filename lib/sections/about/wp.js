// WordPress Gutenberg Block: Ueber uns

export default {
  title: 'Ueber uns',
  icon: 'info-outline',
  description: 'Ueber-uns Bereich mit Text und Highlight-Punkten',
  example: { attributes: { title: '\u00dcber uns', text: 'Wir sind ein erfahrenes Team mit Leidenschaft f\u00fcr Qualit\u00e4t und Innovation.', highlights: '["10+ Jahre Erfahrung","100+ zufriedene Kunden","24/7 Support"]' } },
  attributes: {
    title: { type: 'string', default: '' },
    text: { type: 'string', default: '' },
    highlights: { type: 'string', default: '[]' },
  },
  indexJs: `import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, RichText } from '@wordpress/block-editor';
import './style.scss';
import './editor.scss';
registerBlockType('SLUG/about', {
  edit({ attributes, setAttributes }) {
    const highlights = JSON.parse(attributes.highlights || '[]');
    const updateHighlight = (i, val) => {
      const next = [...highlights];
      next[i] = val;
      setAttributes({ highlights: JSON.stringify(next) });
    };
    const removeHighlight = (i) => setAttributes({ highlights: JSON.stringify(highlights.filter((_, idx) => idx !== i)) });
    const addHighlight = () => setAttributes({ highlights: JSON.stringify([...highlights, 'Neuer Punkt']) });
    return (
      <div {...useBlockProps({ className: 'SLUG-about' })}>
        <div className="SLUG-about__container">
          <div className="SLUG-about__grid">
            <div>
              <RichText tagName="h2" className="SLUG-about__title" value={attributes.title} onChange={v => setAttributes({ title: v })} placeholder="Titel\u2026" allowedFormats={[]} />
              <RichText tagName="p" className="SLUG-about__text" value={attributes.text} onChange={v => setAttributes({ text: v })} placeholder="Beschreibungstext\u2026" allowedFormats={[]} />
            </div>
            <ul className="SLUG-about__highlights">
              {highlights.map((h, i) => (
                <li key={i} className="SLUG-about__highlight SLUG-editor-card">
                  <button className="SLUG-editor-card__remove" onClick={() => removeHighlight(i)} aria-label="Entfernen" type="button">\u00d7</button>
                  <span className="SLUG-about__check">\u2713</span>
                  <input className="SLUG-editor-input" value={h} onChange={e => updateHighlight(i, e.target.value)} placeholder="Highlight\u2026" />
                </li>
              ))}
              <li>
                <button className="SLUG-editor-add SLUG-editor-add--inline" onClick={addHighlight} type="button">
                  <span className="SLUG-editor-add__icon">+</span> Highlight
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  },
  save() { return null; }
});
`,
  renderPhp: `<?php
$title = esc_html($attributes['title'] ?? '');
$text = esc_html($attributes['text'] ?? '');
$highlights = json_decode($attributes['highlights'] ?? '[]', true);
?>
<section class="SLUG-about">
  <div class="SLUG-about__container">
    <div class="SLUG-about__grid">
      <div class="SLUG-about__text-col">
        <?php if ($title): ?><h2 class="SLUG-about__title"><?= $title ?></h2><?php endif; ?>
        <?php if ($text): ?><p class="SLUG-about__text"><?= $text ?></p><?php endif; ?>
      </div>
      <?php if ($highlights): ?>
        <ul class="SLUG-about__highlights">
          <?php foreach ($highlights as $h): ?>
            <li class="SLUG-about__highlight"><span class="SLUG-about__check">&#10003;</span><?= esc_html($h) ?></li>
          <?php endforeach; ?>
        </ul>
      <?php endif; ?>
    </div>
  </div>
</section>
`,
  styleScss: `@use '../../scss/variables' as *;
@use '../../scss/mixins' as *;

.SLUG-about {
  @include section-base;
  background: $surface;

  &__container { @include container; }

  &__grid {
    display: grid;
    gap: 3rem;
    align-items: start;
    @include respond-to(md) { grid-template-columns: 1fr 1fr; }
  }

  &__title { @include section-title; text-align: left; margin-bottom: 1.5rem; }

  &__text {
    font-size: 1.1rem;
    color: $text-muted;
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
    border-radius: $radius-md;
    border: 1px solid $border-color;
    color: $text;
    font-size: 0.95rem;
    transition: border-color $transition-base;
    &:hover { border-color: $primary; }
  }

  &__check {
    color: $primary;
    font-weight: 700;
    flex-shrink: 0;
  }
}
`,
}
