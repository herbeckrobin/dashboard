// WordPress Gutenberg Block: Services

export default {
  title: 'Services',
  icon: 'admin-tools',
  description: 'Dienstleistungs-Karten mit Icon, Titel und Beschreibung',
  example: { attributes: { title: 'Unsere Services', items: '[{"icon":"\ud83d\udd27","title":"Beratung","text":"Individuelle L\u00f6sungen"},{"icon":"\ud83d\udcbb","title":"Entwicklung","text":"Moderne Technologien"},{"icon":"\ud83d\ude80","title":"Optimierung","text":"Performance und SEO"}]' } },
  attributes: {
    title: { type: 'string', default: '' },
    items: { type: 'string', default: '[]' },
  },
  indexJs: `import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, RichText } from '@wordpress/block-editor';
import './style.scss';
import './editor.scss';
registerBlockType('SLUG/services', {
  edit({ attributes, setAttributes }) {
    const items = JSON.parse(attributes.items || '[]');
    const updateItem = (i, key, val) => {
      const next = [...items];
      next[i] = { ...next[i], [key]: val };
      setAttributes({ items: JSON.stringify(next) });
    };
    const removeItem = (i) => setAttributes({ items: JSON.stringify(items.filter((_, idx) => idx !== i)) });
    const addItem = () => setAttributes({ items: JSON.stringify([...items, { icon: '\u2699\ufe0f', title: 'Neuer Service', text: '' }]) });
    return (
      <div {...useBlockProps({ className: 'SLUG-services' })}>
        <div className="SLUG-services__container">
          <RichText tagName="h2" className="SLUG-services__title" value={attributes.title} onChange={v => setAttributes({ title: v })} placeholder="Abschnittstitel\u2026" allowedFormats={[]} />
          <div className="SLUG-services__grid">
            {items.map((item, i) => (
              <div key={i} className="SLUG-services__card SLUG-editor-card">
                <button className="SLUG-editor-card__remove" onClick={() => removeItem(i)} aria-label="Entfernen" type="button">\u00d7</button>
                <span className="SLUG-services__num">{String(i + 1).padStart(2, '0')}</span>
                <input className="SLUG-editor-input SLUG-editor-input--icon" value={item.icon} onChange={e => updateItem(i, 'icon', e.target.value)} />
                <input className="SLUG-services__card-title SLUG-editor-input" value={item.title} onChange={e => updateItem(i, 'title', e.target.value)} placeholder="Titel\u2026" />
                <textarea className="SLUG-services__card-text SLUG-editor-input" value={item.text} onChange={e => updateItem(i, 'text', e.target.value)} placeholder="Beschreibung\u2026" rows={2} />
              </div>
            ))}
            <button className="SLUG-editor-add" onClick={addItem} type="button">
              <span className="SLUG-editor-add__icon">+</span> Service hinzuf\u00fcgen
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
<section class="SLUG-services">
  <div class="SLUG-services__container">
    <?php if ($title): ?><h2 class="SLUG-services__title"><?= $title ?></h2><?php endif; ?>
    <div class="SLUG-services__grid">
      <?php foreach ($items as $i => $item): ?>
        <div class="SLUG-services__card">
          <span class="SLUG-services__num"><?= str_pad($i + 1, 2, '0', STR_PAD_LEFT) ?></span>
          <span class="SLUG-services__icon"><?= esc_html($item['icon'] ?? '') ?></span>
          <h3 class="SLUG-services__card-title"><?= esc_html($item['title'] ?? '') ?></h3>
          <p class="SLUG-services__card-text"><?= esc_html($item['text'] ?? '') ?></p>
        </div>
      <?php endforeach; ?>
    </div>
  </div>
</section>
`,
  styleScss: `@use '../../scss/variables' as *;
@use '../../scss/mixins' as *;

.SLUG-services {
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
    position: relative;
    padding: 2.5rem 2rem 2rem;
    border-radius: $radius-lg;
    background: $surface;
    border: 2px solid transparent;
    @include card-hover;
    &:hover { background: $bg; border-color: $primary; }
  }

  &__num {
    position: absolute;
    top: 1rem;
    right: 1.25rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: $text-muted;
  }

  &__icon { display: block; font-size: 2.25rem; margin-bottom: 1.25rem; }

  &__card-title {
    font-size: 1.2rem;
    font-weight: 600;
    color: $text;
    margin-bottom: 0.75rem;
  }

  &__card-text {
    color: $text-muted;
    line-height: 1.7;
    font-size: 0.95rem;
  }
}
`,
}
