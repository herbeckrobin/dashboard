// WordPress Gutenberg Block: Kontakt

export default {
  title: 'Kontakt',
  icon: 'phone',
  description: 'Kontaktinformationen mit Telefon, E-Mail und Adresse',
  example: { attributes: { title: 'Kontakt', phone: '+49 123 456789', email: 'info@example.com', address: 'Musterstr. 1, 12345 Berlin' } },
  attributes: {
    title: { type: 'string', default: '' },
    phone: { type: 'string', default: '' },
    email: { type: 'string', default: '' },
    address: { type: 'string', default: '' },
  },
  indexJs: `import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, RichText } from '@wordpress/block-editor';
import './style.scss';
import './editor.scss';
registerBlockType('SLUG/contact', {
  edit({ attributes, setAttributes }) {
    return (
      <div {...useBlockProps({ className: 'SLUG-contact' })}>
        <div className="SLUG-contact__container">
          <RichText tagName="h2" className="SLUG-contact__title" value={attributes.title} onChange={v => setAttributes({ title: v })} placeholder="Kontakttitel\u2026" allowedFormats={[]} />
          <div className="SLUG-contact__grid">
            <div className="SLUG-contact__card">
              <span className="SLUG-contact__icon">\ud83d\udcde</span>
              <span className="SLUG-contact__label">Telefon</span>
              <input className="SLUG-contact__value SLUG-editor-input SLUG-editor-input--center" value={attributes.phone} onChange={e => setAttributes({ phone: e.target.value })} placeholder="Telefonnummer\u2026" />
            </div>
            <div className="SLUG-contact__card">
              <span className="SLUG-contact__icon">\u2709\ufe0f</span>
              <span className="SLUG-contact__label">E-Mail</span>
              <input className="SLUG-contact__value SLUG-editor-input SLUG-editor-input--center" value={attributes.email} onChange={e => setAttributes({ email: e.target.value })} placeholder="E-Mail\u2026" />
            </div>
            <div className="SLUG-contact__card">
              <span className="SLUG-contact__icon">\ud83d\udccd</span>
              <span className="SLUG-contact__label">Adresse</span>
              <input className="SLUG-contact__value SLUG-editor-input SLUG-editor-input--center" value={attributes.address} onChange={e => setAttributes({ address: e.target.value })} placeholder="Adresse\u2026" />
            </div>
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
$phone = $attributes['phone'] ?? '';
$email = $attributes['email'] ?? '';
$address = $attributes['address'] ?? '';
?>
<section class="SLUG-contact" id="kontakt">
  <div class="SLUG-contact__container">
    <?php if ($title): ?><h2 class="SLUG-contact__title"><?= $title ?></h2><?php endif; ?>
    <div class="SLUG-contact__grid">
      <?php if ($phone): ?>
        <a href="tel:<?= esc_attr(preg_replace('/\\s/', '', $phone)) ?>" class="SLUG-contact__card">
          <span class="SLUG-contact__icon">&#128222;</span>
          <span class="SLUG-contact__label">Telefon</span>
          <span class="SLUG-contact__value"><?= esc_html($phone) ?></span>
        </a>
      <?php endif; ?>
      <?php if ($email): ?>
        <a href="mailto:<?= esc_attr($email) ?>" class="SLUG-contact__card">
          <span class="SLUG-contact__icon">&#9993;&#65039;</span>
          <span class="SLUG-contact__label">E-Mail</span>
          <span class="SLUG-contact__value"><?= esc_html($email) ?></span>
        </a>
      <?php endif; ?>
      <?php if ($address): ?>
        <div class="SLUG-contact__card">
          <span class="SLUG-contact__icon">&#128205;</span>
          <span class="SLUG-contact__label">Adresse</span>
          <span class="SLUG-contact__value"><?= esc_html($address) ?></span>
        </div>
      <?php endif; ?>
    </div>
  </div>
</section>
`,
  styleScss: `@use '../../scss/variables' as *;
@use '../../scss/mixins' as *;

.SLUG-contact {
  @include section-base;
  background: $bg;

  &__container { @include container; }
  &__title { @include section-title; }

  &__grid {
    display: grid;
    gap: 1.5rem;
    max-width: 48rem;
    margin: 0 auto;
    @include respond-to(sm) { grid-template-columns: repeat(3, 1fr); }
  }

  &__card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 2rem 1.5rem;
    border-radius: $radius-lg;
    border: 1px solid $border-color;
    text-decoration: none;
    color: inherit;
    background: $surface;
    @include card-hover;
    &:hover { border-color: $primary; }
  }

  &__icon { font-size: 2rem; margin-bottom: 0.75rem; }

  &__label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: $text-muted;
    margin-bottom: 0.5rem;
  }

  &__value {
    font-weight: 500;
    color: $text;
    font-size: 0.95rem;
  }
}
`,
}
