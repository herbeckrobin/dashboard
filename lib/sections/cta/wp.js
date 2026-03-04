// WordPress Gutenberg Block: Call to Action

export default {
  title: 'Call to Action',
  icon: 'megaphone',
  description: 'Call-to-Action Banner mit auffaelligem Button',
  example: { attributes: { title: 'Bereit loszulegen?', subtitle: 'Kontaktieren Sie uns noch heute f\u00fcr ein unverbindliches Angebot', ctaText: 'Jetzt starten' } },
  attributes: {
    title: { type: 'string', default: '' },
    subtitle: { type: 'string', default: '' },
    ctaText: { type: 'string', default: '' },
  },
  indexJs: `import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, RichText } from '@wordpress/block-editor';
import './style.scss';
import './editor.scss';
registerBlockType('SLUG/cta', {
  edit({ attributes, setAttributes }) {
    return (
      <div {...useBlockProps({ className: 'SLUG-cta' })}>
        <div className="SLUG-cta__bg" />
        <div className="SLUG-cta__content">
          <RichText tagName="h2" className="SLUG-cta__title" value={attributes.title} onChange={v => setAttributes({ title: v })} placeholder="CTA-Titel\u2026" allowedFormats={[]} />
          <RichText tagName="p" className="SLUG-cta__subtitle" value={attributes.subtitle} onChange={v => setAttributes({ subtitle: v })} placeholder="Untertitel\u2026" allowedFormats={[]} />
          <input className="SLUG-cta__button SLUG-editor-input--btn" value={attributes.ctaText} onChange={e => setAttributes({ ctaText: e.target.value })} placeholder="Button-Text\u2026" />
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
<section class="SLUG-cta">
  <div class="SLUG-cta__bg"></div>
  <div class="SLUG-cta__content">
    <?php if ($title): ?><h2 class="SLUG-cta__title"><?= $title ?></h2><?php endif; ?>
    <?php if ($subtitle): ?><p class="SLUG-cta__subtitle"><?= $subtitle ?></p><?php endif; ?>
    <?php if ($ctaText): ?><a href="#kontakt" class="SLUG-cta__button"><?= $ctaText ?></a><?php endif; ?>
  </div>
</section>
`,
  styleScss: `@use '../../scss/variables' as *;
@use '../../scss/animations';
@use '../../scss/mixins' as *;

.SLUG-cta {
  @include section-base;
  position: relative;
  text-align: center;
  color: $text-inverted;

  &__bg {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, $primary 0%, $secondary 100%);
    background-size: 200% 200%;
    animation: gradient-shift 10s ease infinite;
  }

  &__content {
    position: relative;
    z-index: 1;
    max-width: 40rem;
    margin: 0 auto;
    padding: $spacing-xl 0;
  }

  &__title {
    font-size: clamp(1.75rem, 3.5vw, 2.5rem);
    font-weight: 700;
    margin-bottom: 1rem;
  }

  &__subtitle {
    font-size: 1.1rem;
    color: rgba(255,255,255,0.8);
    margin-bottom: 2rem;
  }

  &__button {
    display: inline-block;
    padding: 0.9rem 2.5rem;
    background: white;
    color: var(--wp--preset--color--dark);
    font-weight: 600;
    border-radius: $radius-md;
    text-decoration: none;
    transition: transform $transition-fast, box-shadow $transition-fast;
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(0,0,0,0.2);
    }
  }
}
`,
}
