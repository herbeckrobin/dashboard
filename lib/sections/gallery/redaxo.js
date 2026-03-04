// Redaxo Modul: Galerie

export default {
  title: 'Galerie',
  input: `<?php
if (class_exists('FriendsOfRedaxo\\MForm')) {
  echo FriendsOfRedaxo\\MForm::factory()
    ->addTextField(1.0, ['label' => 'Galerietitel'])
    ->addRepeaterElement(2, FriendsOfRedaxo\\MForm::factory()
      ->addTextField('title', ['label' => 'Titel'])
      ->addTextField('description', ['label' => 'Beschreibung'])
    , true, true, ['min' => 2, 'max' => 12])
    ->show();
} else { ?>
<fieldset><legend>Galerie <small>(MForm nicht aktiv)</small></legend>
  <label>Galerietitel</label><input class="form-control" type="text" name="REX_INPUT_VALUE[1]" value="REX_VALUE[1]" />
  <label>Items (JSON)</label><textarea class="form-control" name="REX_INPUT_VALUE[2]" rows="6">REX_VALUE[2]</textarea>
  <small>Format: [{"title":"...", "description":"..."}, ...]</small>
</fieldset>
<?php } ?>`,
  output: `<?php
$title = 'REX_VALUE[1]';
$items = json_decode('REX_VALUE[2]', true) ?: [];
?>
<section class="section section--gallery" id="gallery">
  <div class="container">
    <?php if ($title): ?><h2 class="section__title"><?= rex_escape($title) ?></h2><?php endif; ?>
    <div class="gallery-grid">
      <?php foreach ($items as $item): ?>
      <div class="gallery-item">
        <div class="gallery-item__overlay">
          <h3 class="gallery-item__title"><?= rex_escape($item['title'] ?? '') ?></h3>
          <p class="gallery-item__desc"><?= rex_escape($item['description'] ?? '') ?></p>
        </div>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</section>`,
}
