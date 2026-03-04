// WordPress Gutenberg Block: Hero Section

export default {
  title: 'Hero Section',
  icon: 'star-filled',
  description: 'Grosser Hero-Bereich mit Titel, Untertitel und Call-to-Action',
  example: { attributes: { title: 'Willkommen auf unserer Website', subtitle: 'Entdecken Sie unsere Dienstleistungen und Angebote', ctaText: 'Mehr erfahren' } },
  attributes: {
    title: { type: 'string', default: 'Willkommen' },
    subtitle: { type: 'string', default: '' },
    ctaText: { type: 'string', default: 'Mehr erfahren' },
  },
  indexJs: `import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, RichText } from '@wordpress/block-editor';
import './style.scss';
import './editor.scss';
registerBlockType('SLUG/hero', {
  edit({ attributes, setAttributes }) {
    return (
      <div {...useBlockProps({ className: 'SLUG-hero' })}>
        <div className="SLUG-hero__bg" />
        <div className="SLUG-hero__content">
          <RichText tagName="h1" className="SLUG-hero__title" value={attributes.title} onChange={v => setAttributes({ title: v })} placeholder="Titel eingeben\u2026" allowedFormats={[]} />
          <RichText tagName="p" className="SLUG-hero__subtitle" value={attributes.subtitle} onChange={v => setAttributes({ subtitle: v })} placeholder="Untertitel eingeben\u2026" allowedFormats={[]} />
          <input className="SLUG-hero__cta SLUG-editor-input--btn" value={attributes.ctaText} onChange={e => setAttributes({ ctaText: e.target.value })} placeholder="Button-Text\u2026" />
        </div>
      </div>
    );
  },
  save() { return null; }
});
`,
  renderPhp: `<?php
$title = esc_html($attributes['title'] ?? '');
$subtitle = esc_html($attributes['subtitle'] ?? '');
$ctaText = esc_html($attributes['ctaText'] ?? '');
?>
<section class="SLUG-hero">
  <div class="SLUG-hero__bg"></div>
  <div class="SLUG-hero__content">
    <h1 class="SLUG-hero__title"><?= $title ?></h1>
    <?php if ($subtitle): ?><p class="SLUG-hero__subtitle"><?= $subtitle ?></p><?php endif; ?>
    <?php if ($ctaText): ?><a href="#kontakt" class="SLUG-hero__cta"><?= $ctaText ?></a><?php endif; ?>
  </div>
</section>
`,
  styleScss: `@use '../../scss/variables' as *;
@use '../../scss/animations';
@use '../../scss/mixins' as *;

.SLUG-hero {
  position: relative;
  min-height: 85vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-inverted;
  overflow: hidden;

  &__bg {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, $primary 0%, $secondary 100%);
    background-size: 200% 200%;
    animation: gradient-shift 12s ease infinite;
  }

  &__content {
    position: relative;
    z-index: 1;
    text-align: center;
    padding: $spacing-xl $spacing-md;
    max-width: 48rem;
  }

  &__title {
    font-size: clamp(2.5rem, 5vw, 4rem);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.02em;
  }

  &__subtitle {
    margin-top: 1.5rem;
    font-size: clamp(1.05rem, 2vw, 1.25rem);
    color: rgba(255,255,255,0.7);
    max-width: 36rem;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.7;
  }

  &__cta {
    display: inline-block;
    margin-top: 2.5rem;
    padding: 0.9rem 2.5rem;
    background: white;
    color: var(--wp--preset--color--dark);
    font-weight: 600;
    border-radius: 0.75rem;
    text-decoration: none;
    transition: transform $transition-fast, box-shadow $transition-fast;
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(0,0,0,0.3);
    }
  }
}
`,
}
