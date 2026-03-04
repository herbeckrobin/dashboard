// Redaxo Modul: Kontakt

export default {
  title: 'Kontakt',
  input: `<?php
if (class_exists('FriendsOfRedaxo\\MForm')) {
  echo FriendsOfRedaxo\\MForm::factory()
    ->addTextField(1.0, ['label' => 'Titel'])
    ->addTextField(2.0, ['label' => 'Telefon'])
    ->addTextField(3.0, ['label' => 'E-Mail'])
    ->addTextField(4.0, ['label' => 'Adresse'])
    ->show();
} else { ?>
<fieldset><legend>Kontakt <small>(MForm nicht aktiv)</small></legend>
  <label>Titel</label><input class="form-control" type="text" name="REX_INPUT_VALUE[1]" value="REX_VALUE[1]" />
  <label>Telefon</label><input class="form-control" type="text" name="REX_INPUT_VALUE[2]" value="REX_VALUE[2]" />
  <label>E-Mail</label><input class="form-control" type="text" name="REX_INPUT_VALUE[3]" value="REX_VALUE[3]" />
  <label>Adresse</label><input class="form-control" type="text" name="REX_INPUT_VALUE[4]" value="REX_VALUE[4]" />
</fieldset>
<?php } ?>`,
  output: `<?php
$title = 'REX_VALUE[1]';
$phone = 'REX_VALUE[2]';
$email = 'REX_VALUE[3]';
$address = 'REX_VALUE[4]';
?>
<section class="section section--contact" id="kontakt">
  <div class="container">
    <?php if ($title): ?><h2 class="section__title"><?= rex_escape($title) ?></h2><?php endif; ?>
    <div class="contact-grid">
      <div class="contact-info">
        <?php if ($phone): ?><div class="contact-item"><span class="contact-item__icon">&#128222;</span><span><?= rex_escape($phone) ?></span></div><?php endif; ?>
        <?php if ($email): ?><div class="contact-item"><span class="contact-item__icon">&#9993;</span><a href="mailto:<?= rex_escape($email) ?>"><?= rex_escape($email) ?></a></div><?php endif; ?>
        <?php if ($address): ?><div class="contact-item"><span class="contact-item__icon">&#128205;</span><span><?= rex_escape($address) ?></span></div><?php endif; ?>
      </div>
    </div>
  </div>
</section>`,
}
