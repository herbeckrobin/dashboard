// Redaxo Modul: Call to Action

export default {
  title: 'Call to Action',
  input: `<?php
if (class_exists('FriendsOfRedaxo\\MForm')) {
  echo FriendsOfRedaxo\\MForm::factory()
    ->addTextField(1.0, ['label' => 'Titel'])
    ->addTextField(2.0, ['label' => 'Untertitel'])
    ->addTextField(3.0, ['label' => 'Button-Text'])
    ->show();
} else { ?>
<fieldset><legend>Call to Action <small>(MForm nicht aktiv)</small></legend>
  <label>Titel</label><input class="form-control" type="text" name="REX_INPUT_VALUE[1]" value="REX_VALUE[1]" />
  <label>Untertitel</label><input class="form-control" type="text" name="REX_INPUT_VALUE[2]" value="REX_VALUE[2]" />
  <label>Button-Text</label><input class="form-control" type="text" name="REX_INPUT_VALUE[3]" value="REX_VALUE[3]" />
</fieldset>
<?php } ?>`,
  output: `<?php
$title = 'REX_VALUE[1]';
$subtitle = 'REX_VALUE[2]';
$ctaText = 'REX_VALUE[3]';
?>
<section class="section section--cta" id="cta">
  <div class="container cta__content">
    <?php if ($title): ?><h2 class="cta__title"><?= rex_escape($title) ?></h2><?php endif; ?>
    <?php if ($subtitle): ?><p class="cta__subtitle"><?= rex_escape($subtitle) ?></p><?php endif; ?>
    <?php if ($ctaText): ?><a href="#kontakt" class="btn btn--primary btn--lg"><?= rex_escape($ctaText) ?></a><?php endif; ?>
  </div>
</section>`,
}
