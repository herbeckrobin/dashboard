// WordPress Gutenberg Block: FAQ

export default {
  title: 'FAQ',
  icon: 'editor-help',
  description: 'Haeufig gestellte Fragen mit Akkordeon',
  example: { attributes: { title: 'H\u00e4ufige Fragen', items: '[{"question":"Wie funktioniert der Service?","answer":"Ganz einfach: Kontaktieren Sie uns und wir erstellen ein individuelles Angebot."},{"question":"Was kostet es?","answer":"Die Kosten richten sich nach dem Projektumfang. Fordern Sie ein unverbindliches Angebot an."}]' } },
  attributes: {
    title: { type: 'string', default: '' },
    items: { type: 'string', default: '[]' },
  },
  indexJs: `import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, RichText } from '@wordpress/block-editor';
import './style.scss';
import './editor.scss';
registerBlockType('SLUG/faq', {
  edit({ attributes, setAttributes }) {
    const items = JSON.parse(attributes.items || '[]');
    const updateItem = (i, key, val) => {
      const next = [...items];
      next[i] = { ...next[i], [key]: val };
      setAttributes({ items: JSON.stringify(next) });
    };
    const removeItem = (i) => setAttributes({ items: JSON.stringify(items.filter((_, idx) => idx !== i)) });
    const addItem = () => setAttributes({ items: JSON.stringify([...items, { question: 'Neue Frage?', answer: '' }]) });
    return (
      <div {...useBlockProps({ className: 'SLUG-faq' })}>
        <div className="SLUG-faq__container">
          <RichText tagName="h2" className="SLUG-faq__title" value={attributes.title} onChange={v => setAttributes({ title: v })} placeholder="FAQ-Titel\u2026" allowedFormats={[]} />
          <div className="SLUG-faq__list">
            {items.map((item, i) => (
              <div key={i} className="SLUG-faq__item SLUG-editor-card">
                <button className="SLUG-editor-card__remove" onClick={() => removeItem(i)} aria-label="Entfernen" type="button">\u00d7</button>
                <input className="SLUG-faq__question SLUG-editor-input" value={item.question} onChange={e => updateItem(i, 'question', e.target.value)} placeholder="Frage\u2026" />
                <textarea className="SLUG-faq__answer SLUG-editor-input" value={item.answer} onChange={e => updateItem(i, 'answer', e.target.value)} placeholder="Antwort\u2026" rows={2} />
              </div>
            ))}
            <button className="SLUG-editor-add SLUG-editor-add--inline" onClick={addItem} type="button">
              <span className="SLUG-editor-add__icon">+</span> Frage hinzuf\u00fcgen
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
$block_id = 'faq-' . wp_unique_id();
?>
<section class="SLUG-faq">
  <div class="SLUG-faq__container">
    <?php if ($title): ?><h2 class="SLUG-faq__title"><?= $title ?></h2><?php endif; ?>
    <div class="SLUG-faq__list">
      <?php foreach ($items as $i => $item): ?>
        <details class="SLUG-faq__item">
          <summary class="SLUG-faq__question"><?= esc_html($item['question'] ?? '') ?></summary>
          <div class="SLUG-faq__answer"><?= esc_html($item['answer'] ?? '') ?></div>
        </details>
      <?php endforeach; ?>
    </div>
  </div>
</section>
`,
  styleScss: `@use '../../scss/variables' as *;
@use '../../scss/mixins' as *;

.SLUG-faq {
  @include section-base;
  background: $surface;

  &__container {
    @include container;
    max-width: 48rem;
  }

  &__title { @include section-title; }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__item {
    border-radius: $radius-lg;
    border: 1px solid $border-color;
    background: $bg;
    overflow: hidden;
    transition: border-color $transition-base;
    &:hover { border-color: $primary; }
    &[open] { border-color: $primary; box-shadow: $shadow-card; }
  }

  &__question {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    cursor: pointer;
    font-weight: 500;
    color: $text;
    font-size: 1rem;
    list-style: none;
    &::-webkit-details-marker { display: none; }
    &::after {
      content: '+';
      font-size: 1.25rem;
      color: $text-muted;
      transition: transform $transition-base;
    }
  }

  &__item[open] &__question::after {
    content: '\\2212';
    color: $primary;
  }

  &__answer {
    padding: 0 1.5rem 1.25rem;
    color: $text-muted;
    line-height: 1.75;
    font-size: 0.95rem;
  }
}
`,
}
