// WordPress Gutenberg Block: Features

export default {
  title: 'Features',
  icon: 'grid-view',
  description: 'Feature-Karten in einem responsiven Grid',
  example: { attributes: { title: 'Unsere Features', items: '[{"icon":"\u26a1","title":"Schnell","text":"Blitzschnelle Ladezeiten"},{"icon":"\ud83c\udfa8","title":"Modern","text":"Zeitgem\u00e4sses Design"},{"icon":"\ud83d\udcf1","title":"Responsiv","text":"Optimiert f\u00fcr alle Ger\u00e4te"}]' } },
  attributes: {
    title: { type: 'string', default: '' },
    items: { type: 'string', default: '[]' },
  },
  indexJs: `import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, RichText } from '@wordpress/block-editor';
import './style.scss';
import './editor.scss';
registerBlockType('SLUG/features', {
  edit({ attributes, setAttributes }) {
    const items = JSON.parse(attributes.items || '[]');
    const updateItem = (i, key, val) => {
      const next = [...items];
      next[i] = { ...next[i], [key]: val };
      setAttributes({ items: JSON.stringify(next) });
    };
    const removeItem = (i) => setAttributes({ items: JSON.stringify(items.filter((_, idx) => idx !== i)) });
    const addItem = () => setAttributes({ items: JSON.stringify([...items, { icon: '\u2b50', title: 'Neues Feature', text: '' }]) });
    return (
      <div {...useBlockProps({ className: 'SLUG-features' })}>
        <div className="SLUG-features__container">
          <RichText tagName="h2" className="SLUG-features__title" value={attributes.title} onChange={v => setAttributes({ title: v })} placeholder="Abschnittstitel\u2026" allowedFormats={[]} />
          <div className="SLUG-features__grid">
            {items.map((item, i) => (
              <div key={i} className="SLUG-features__card SLUG-editor-card">
                <button className="SLUG-editor-card__remove" onClick={() => removeItem(i)} aria-label="Entfernen" type="button">\u00d7</button>
                <input className="SLUG-editor-input SLUG-editor-input--icon" value={item.icon} onChange={e => updateItem(i, 'icon', e.target.value)} />
                <input className="SLUG-features__card-title SLUG-editor-input" value={item.title} onChange={e => updateItem(i, 'title', e.target.value)} placeholder="Titel\u2026" />
                <textarea className="SLUG-features__card-text SLUG-editor-input" value={item.text} onChange={e => updateItem(i, 'text', e.target.value)} placeholder="Beschreibung\u2026" rows={2} />
              </div>
            ))}
            <button className="SLUG-editor-add" onClick={addItem} type="button">
              <span className="SLUG-editor-add__icon">+</span> Feature hinzuf\u00fcgen
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
$title = esc_html($attributes['title'] ?? '');
$items = json_decode($attributes['items'] ?? '[]', true);
?>
<section class="SLUG-features">
  <div class="SLUG-features__container">
    <?php if ($title): ?><h2 class="SLUG-features__title"><?= $title ?></h2><?php endif; ?>
    <div class="SLUG-features__grid">
      <?php foreach ($items as $item): ?>
        <div class="SLUG-features__card">
          <span class="SLUG-features__icon"><?= esc_html($item['icon'] ?? '') ?></span>
          <h3 class="SLUG-features__card-title"><?= esc_html($item['title'] ?? '') ?></h3>
          <p class="SLUG-features__card-text"><?= esc_html($item['text'] ?? '') ?></p>
        </div>
      <?php endforeach; ?>
    </div>
  </div>
</section>
`,
  styleScss: `@use '../../scss/variables' as *;
@use '../../scss/mixins' as *;

.SLUG-features {
  @include section-base;
  background: $bg;

  &__container { @include container; }
  &__title { @include section-title; }

  &__grid {
    display: grid;
    gap: 2rem;
    @include respond-to(sm) { grid-template-columns: repeat(2, 1fr); }
    @include respond-to(lg) { grid-template-columns: repeat(3, 1fr); }
  }

  &__card {
    padding: 2rem;
    border-radius: $radius-lg;
    border: 1px solid $border-color;
    background: $surface;
    @include card-hover;
  }

  &__icon {
    display: block;
    font-size: 2.5rem;
    margin-bottom: 1rem;
  }

  &__card-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: $text;
    margin-bottom: 0.5rem;
  }

  &__card-text {
    color: $text-muted;
    line-height: 1.7;
    font-size: 0.95rem;
  }
}
`,
}
