// Redaxo Modul: Statistiken

export default {
  title: 'Statistiken',
  input: `<?php
if (class_exists('FriendsOfRedaxo\\MForm')) {
  echo FriendsOfRedaxo\\MForm::factory()
    ->addRepeaterElement(1, FriendsOfRedaxo\\MForm::factory()
      ->addTextField('value', ['label' => 'Wert (z.B. 500+)'])
      ->addTextField('label', ['label' => 'Bezeichnung'])
    , true, true, ['min' => 2, 'max' => 6])
    ->show();
} else { ?>
<fieldset><legend>Statistiken <small>(MForm nicht aktiv)</small></legend>
  <label>Items (JSON)</label><textarea class="form-control" name="REX_INPUT_VALUE[1]" rows="6">REX_VALUE[1]</textarea>
  <small>Format: [{"value":"500+", "label":"Projekte"}, ...]</small>
</fieldset>
<?php } ?>`,
  output: `<?php
$items = json_decode('REX_VALUE[1]', true) ?: [];
?>
<section class="section section--stats" id="stats">
  <div class="container">
    <div class="stats-grid">
      <?php foreach ($items as $item): ?>
      <div class="stat">
        <span class="stat__value"><?= rex_escape($item['value'] ?? '') ?></span>
        <span class="stat__label"><?= rex_escape($item['label'] ?? '') ?></span>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</section>`,
}
