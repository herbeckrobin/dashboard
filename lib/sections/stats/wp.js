// WordPress Gutenberg Block: Statistiken

export default {
  title: 'Statistiken',
  icon: 'chart-bar',
  description: 'Zahlen und Kennzahlen als Statistik-Grid',
  example: { attributes: { items: '[{"value":"500+","label":"Kunden"},{"value":"10+","label":"Jahre"},{"value":"99%","label":"Zufriedenheit"},{"value":"24/7","label":"Support"}]' } },
  attributes: {
    items: { type: 'string', default: '[]' },
  },
  indexJs: `import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps } from '@wordpress/block-editor';
import './style.scss';
import './editor.scss';
registerBlockType('SLUG/stats', {
  edit({ attributes, setAttributes }) {
    const items = JSON.parse(attributes.items || '[]');
    const updateItem = (i, key, val) => {
      const next = [...items];
      next[i] = { ...next[i], [key]: val };
      setAttributes({ items: JSON.stringify(next) });
    };
    const removeItem = (i) => setAttributes({ items: JSON.stringify(items.filter((_, idx) => idx !== i)) });
    const addItem = () => setAttributes({ items: JSON.stringify([...items, { value: '0+', label: 'Bezeichnung' }]) });
    return (
      <div {...useBlockProps({ className: 'SLUG-stats' })}>
        <div className="SLUG-stats__container">
          <div className="SLUG-stats__grid">
            {items.map((item, i) => (
              <div key={i} className="SLUG-stats__item SLUG-editor-card">
                <button className="SLUG-editor-card__remove" onClick={() => removeItem(i)} aria-label="Entfernen" type="button">\u00d7</button>
                <input className="SLUG-stats__value SLUG-editor-input SLUG-editor-input--center" value={item.value} onChange={e => updateItem(i, 'value', e.target.value)} placeholder="0+" />
                <div className="SLUG-stats__divider" />
                <input className="SLUG-stats__label SLUG-editor-input SLUG-editor-input--center" value={item.label} onChange={e => updateItem(i, 'label', e.target.value)} placeholder="Label" />
              </div>
            ))}
            <button className="SLUG-editor-add" onClick={addItem} type="button">
              <span className="SLUG-editor-add__icon">+</span> Statistik
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
<section class="SLUG-stats">
  <div class="SLUG-stats__container">
    <div class="SLUG-stats__grid">
      <?php foreach ($items as $item): ?>
        <div class="SLUG-stats__item">
          <div class="SLUG-stats__value"><?= esc_html($item['value'] ?? '') ?></div>
          <div class="SLUG-stats__divider"></div>
          <div class="SLUG-stats__label"><?= esc_html($item['label'] ?? '') ?></div>
        </div>
      <?php endforeach; ?>
    </div>
  </div>
</section>
`,
  styleScss: `@use '../../scss/variables' as *;
@use '../../scss/mixins' as *;

.SLUG-stats {
  @include section-base;
  background: $surface-alt;

  &__container { @include container; }

  &__grid {
    display: grid;
    gap: 2.5rem;
    text-align: center;
    @include respond-to(sm) { grid-template-columns: repeat(2, 1fr); }
    @include respond-to(md) { grid-template-columns: repeat(4, 1fr); }
  }

  &__item { padding: 1.5rem; }

  &__value {
    font-size: clamp(2rem, 4vw, 3rem);
    font-weight: 800;
    font-family: $font-heading;
    letter-spacing: -0.02em;
    color: $primary;
  }

  &__divider {
    width: 2rem;
    height: 2px;
    background: $primary;
    margin: 0.75rem auto;
    border-radius: 1px;
    opacity: 0.25;
  }

  &__label {
    font-size: 0.8rem;
    color: $text-muted;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
}
`,
}
