// Redaxo Modul: Kundenstimmen

export default {
  title: 'Kundenstimmen',
  input: `<?php
if (class_exists('FriendsOfRedaxo\\MForm')) {
  echo FriendsOfRedaxo\\MForm::factory()
    ->addRepeaterElement(1, FriendsOfRedaxo\\MForm::factory()
      ->addTextAreaField('quote', ['label' => 'Zitat'])
      ->addTextField('author', ['label' => 'Name'])
      ->addTextField('role', ['label' => 'Position / Rolle'])
    , true, true, ['min' => 1, 'max' => 6])
    ->show();
} else { ?>
<fieldset><legend>Kundenstimmen <small>(MForm nicht aktiv)</small></legend>
  <label>Items (JSON)</label><textarea class="form-control" name="REX_INPUT_VALUE[1]" rows="6">REX_VALUE[1]</textarea>
  <small>Format: [{"quote":"...", "author":"...", "role":"..."}, ...]</small>
</fieldset>
<?php } ?>`,
  output: `<?php
$items = json_decode('REX_VALUE[1]', true) ?: [];
?>
<section class="section section--testimonials" id="testimonials">
  <div class="container">
    <h2 class="section__title">Das sagen unsere Kunden</h2>
    <div class="card-grid">
      <?php foreach ($items as $item): ?>
      <div class="card card--testimonial">
        <blockquote class="testimonial__quote">&ldquo;<?= rex_escape($item['quote'] ?? '') ?>&rdquo;</blockquote>
        <div class="testimonial__author">
          <strong><?= rex_escape($item['author'] ?? '') ?></strong>
          <?php if (!empty($item['role'])): ?><span class="testimonial__role"><?= rex_escape($item['role']) ?></span><?php endif; ?>
        </div>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</section>`,
}
