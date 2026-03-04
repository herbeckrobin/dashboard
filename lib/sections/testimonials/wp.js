// WordPress Gutenberg Block: Kundenstimmen

export default {
  title: 'Kundenstimmen',
  icon: 'format-quote',
  description: 'Kundenstimmen und Bewertungen als Karten',
  example: { attributes: { items: '[{"quote":"Hervorragende Arbeit und toller Service!","author":"Max Mustermann","role":"Gesch\u00e4ftsf\u00fchrer"},{"quote":"Sehr professionell und zuverl\u00e4ssig.","author":"Anna Schmidt","role":"Marketing-Leiterin"}]' } },
  attributes: {
    items: { type: 'string', default: '[]' },
  },
  indexJs: `import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps } from '@wordpress/block-editor';
import './style.scss';
import './editor.scss';
registerBlockType('SLUG/testimonials', {
  edit({ attributes, setAttributes }) {
    const items = JSON.parse(attributes.items || '[]');
    const updateItem = (i, key, val) => {
      const next = [...items];
      next[i] = { ...next[i], [key]: val };
      setAttributes({ items: JSON.stringify(next) });
    };
    const removeItem = (i) => setAttributes({ items: JSON.stringify(items.filter((_, idx) => idx !== i)) });
    const addItem = () => setAttributes({ items: JSON.stringify([...items, { quote: '', author: 'Name', role: 'Position' }]) });
    return (
      <div {...useBlockProps({ className: 'SLUG-testimonials' })}>
        <div className="SLUG-testimonials__container">
          <div className="SLUG-testimonials__grid">
            {items.map((item, i) => (
              <blockquote key={i} className="SLUG-testimonials__card SLUG-editor-card">
                <button className="SLUG-editor-card__remove" onClick={() => removeItem(i)} aria-label="Entfernen" type="button">\u00d7</button>
                <span className="SLUG-testimonials__quote-mark">&ldquo;</span>
                <textarea className="SLUG-testimonials__text SLUG-editor-input" value={item.quote} onChange={e => updateItem(i, 'quote', e.target.value)} placeholder="Zitat eingeben\u2026" rows={3} />
                <footer className="SLUG-testimonials__footer">
                  <input className="SLUG-testimonials__author SLUG-editor-input" value={item.author} onChange={e => updateItem(i, 'author', e.target.value)} placeholder="Name" />
                  <input className="SLUG-testimonials__role SLUG-editor-input" value={item.role} onChange={e => updateItem(i, 'role', e.target.value)} placeholder="Position" />
                </footer>
              </blockquote>
            ))}
            <button className="SLUG-editor-add" onClick={addItem} type="button">
              <span className="SLUG-editor-add__icon">+</span> Kundenstimme hinzuf\u00fcgen
            </button>
          </div>
        </div>
      </div>
    );
  },
  save() { return null; }
});
`,
  renderPhp: `<?php
$items = json_decode($attributes['items'] ?? '[]', true);
?>
<section class="SLUG-testimonials">
  <div class="SLUG-testimonials__container">
    <div class="SLUG-testimonials__grid">
      <?php foreach ($items as $item): ?>
        <blockquote class="SLUG-testimonials__card">
          <span class="SLUG-testimonials__quote-mark">&ldquo;</span>
          <p class="SLUG-testimonials__text"><?= esc_html($item['quote'] ?? '') ?></p>
          <footer class="SLUG-testimonials__footer">
            <strong class="SLUG-testimonials__author"><?= esc_html($item['author'] ?? '') ?></strong>
            <span class="SLUG-testimonials__role"><?= esc_html($item['role'] ?? '') ?></span>
          </footer>
        </blockquote>
      <?php endforeach; ?>
    </div>
  </div>
</section>
`,
  styleScss: `@use '../../scss/variables' as *;
@use '../../scss/mixins' as *;

.SLUG-testimonials {
  @include section-base;
  background: $surface;

  &__container { @include container; }

  &__grid {
    display: grid;
    gap: 2rem;
    @include respond-to(md) { grid-template-columns: repeat(2, 1fr); }
  }

  &__card {
    position: relative;
    padding: 2.5rem 2rem 2rem;
    border-radius: $radius-lg;
    background: $bg;
    border: 1px solid $border-color;
    transition: box-shadow $transition-base;
    &:hover { box-shadow: $shadow-card; }
  }

  &__quote-mark {
    position: absolute;
    top: 0.5rem;
    left: 1rem;
    font-size: 4rem;
    line-height: 1;
    color: $primary;
    opacity: 0.1;
    font-family: Georgia, serif;
  }

  &__text {
    color: $text;
    line-height: 1.75;
    font-style: italic;
    margin-bottom: 1.5rem;
    position: relative;
    z-index: 1;
  }

  &__footer { display: flex; flex-direction: column; }
  &__author { font-weight: 600; color: $text; font-size: 0.9rem; }
  &__role { color: $text-muted; font-size: 0.8rem; }
}
`,
}
