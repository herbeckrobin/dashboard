// Redaxo Modul: Features

export default {
  title: 'Features',
  input: `<?php
if (class_exists('FriendsOfRedaxo\\MForm')) {
  echo FriendsOfRedaxo\\MForm::factory()
    ->addTextField(1.0, ['label' => 'Abschnittstitel'])
    ->addRepeaterElement(2, FriendsOfRedaxo\\MForm::factory()
      ->addTextField('icon', ['label' => 'Icon (Emoji)'])
      ->addTextField('title', ['label' => 'Titel'])
      ->addTextAreaField('text', ['label' => 'Beschreibung'])
    , true, true, ['min' => 1, 'max' => 8])
    ->show();
} else { ?>
<fieldset><legend>Features <small>(MForm nicht aktiv)</small></legend>
  <label>Abschnittstitel</label><input class="form-control" type="text" name="REX_INPUT_VALUE[1]" value="REX_VALUE[1]" />
  <label>Items (JSON)</label><textarea class="form-control" name="REX_INPUT_VALUE[2]" rows="6">REX_VALUE[2]</textarea>
  <small>Format: [{"icon":"...", "title":"...", "text":"..."}, ...]</small>
</fieldset>
<?php } ?>`,
  output: `<?php
$title = 'REX_VALUE[1]';
$items = json_decode('REX_VALUE[2]', true) ?: [];
?>
<section class="section section--features" id="features">
  <div class="container">
    <?php if ($title): ?><h2 class="section__title"><?= rex_escape($title) ?></h2><?php endif; ?>
    <div class="card-grid">
      <?php foreach ($items as $item): ?>
      <div class="card">
        <?php if (!empty($item['icon'])): ?><span class="card__icon"><?= $item['icon'] ?></span><?php endif; ?>
        <h3 class="card__title"><?= rex_escape($item['title'] ?? '') ?></h3>
        <p class="card__text"><?= rex_escape($item['text'] ?? '') ?></p>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</section>`,
}
