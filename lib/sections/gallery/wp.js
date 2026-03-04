// WordPress Gutenberg Block: Galerie

export default {
  title: 'Galerie',
  icon: 'format-gallery',
  description: 'Portfolio oder Bildergalerie mit Overlay',
  example: { attributes: { title: 'Unsere Projekte', items: '[{"title":"Projekt Alpha","description":"Webdesign & Entwicklung"},{"title":"Projekt Beta","description":"Branding & Identity"},{"title":"Projekt Gamma","description":"E-Commerce L\u00f6sung"}]' } },
  attributes: {
    title: { type: 'string', default: '' },
    items: { type: 'string', default: '[]' },
  },
  indexJs: `import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, RichText } from '@wordpress/block-editor';
import './style.scss';
import './editor.scss';
registerBlockType('SLUG/gallery', {
  edit({ attributes, setAttributes }) {
    const items = JSON.parse(attributes.items || '[]');
    const updateItem = (i, key, val) => {
      const next = [...items];
      next[i] = { ...next[i], [key]: val };
      setAttributes({ items: JSON.stringify(next) });
    };
    const removeItem = (i) => setAttributes({ items: JSON.stringify(items.filter((_, idx) => idx !== i)) });
    const addItem = () => setAttributes({ items: JSON.stringify([...items, { title: 'Neues Bild', description: '' }]) });
    return (
      <div {...useBlockProps({ className: 'SLUG-gallery' })}>
        <div className="SLUG-gallery__container">
          <RichText tagName="h2" className="SLUG-gallery__title" value={attributes.title} onChange={v => setAttributes({ title: v })} placeholder="Galerietitel\u2026" allowedFormats={[]} />
          <div className="SLUG-gallery__grid">
            {items.map((item, i) => (
              <div key={i} className="SLUG-gallery__item SLUG-editor-card">
                <button className="SLUG-editor-card__remove" onClick={() => removeItem(i)} aria-label="Entfernen" type="button">\u00d7</button>
                <div className="SLUG-gallery__icon-wrap"><span>\ud83d\uddbc</span></div>
                <div className="SLUG-gallery__overlay SLUG-gallery__overlay--edit">
                  <input className="SLUG-gallery__item-title SLUG-editor-input" value={item.title} onChange={e => updateItem(i, 'title', e.target.value)} placeholder="Titel\u2026" />
                  <input className="SLUG-gallery__item-desc SLUG-editor-input" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Beschreibung\u2026" />
                </div>
              </div>
            ))}
            <button className="SLUG-editor-add" onClick={addItem} type="button" style={{aspectRatio:'4/3'}}>
              <span className="SLUG-editor-add__icon">+</span> Bild
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
<section class="SLUG-gallery">
  <div class="SLUG-gallery__container">
    <?php if ($title): ?><h2 class="SLUG-gallery__title"><?= $title ?></h2><?php endif; ?>
    <div class="SLUG-gallery__grid">
      <?php foreach ($items as $item): ?>
        <div class="SLUG-gallery__item">
          <div class="SLUG-gallery__icon-wrap"><span>&#128444;</span></div>
          <div class="SLUG-gallery__overlay">
            <h3 class="SLUG-gallery__item-title"><?= esc_html($item['title'] ?? '') ?></h3>
            <p class="SLUG-gallery__item-desc"><?= esc_html($item['description'] ?? '') ?></p>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
  </div>
</section>
`,
  styleScss: `@use '../../scss/variables' as *;
@use '../../scss/mixins' as *;

.SLUG-gallery {
  @include section-base;
  background: $bg;

  &__container { @include container; }
  &__title { @include section-title; }

  &__grid {
    display: grid;
    gap: 1.25rem;
    @include respond-to(sm) { grid-template-columns: repeat(2, 1fr); }
    @include respond-to(lg) { grid-template-columns: repeat(3, 1fr); }
  }

  &__item {
    position: relative;
    aspect-ratio: 4/3;
    border-radius: $radius-lg;
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
    font-size: 3rem;
    opacity: 0.3;
    transition: opacity $transition-base;
  }

  &__overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%);
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 1.25rem;
    opacity: 0;
    transition: opacity $transition-base;
  }

  &__item:hover &__overlay { opacity: 1; }
  &__item:hover &__icon-wrap { opacity: 0.1; }

  &__item-title { color: white; font-weight: 600; font-size: 1rem; margin-bottom: 0.25rem; }
  &__item-desc { color: rgba(255,255,255,0.7); font-size: 0.85rem; }
}
`,
}
