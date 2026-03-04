// Redaxo Modul: FAQ

export default {
  title: 'FAQ',
  input: `<?php
if (class_exists('FriendsOfRedaxo\\MForm')) {
  echo FriendsOfRedaxo\\MForm::factory()
    ->addTextField(1.0, ['label' => 'FAQ-Titel'])
    ->addRepeaterElement(2, FriendsOfRedaxo\\MForm::factory()
      ->addTextField('question', ['label' => 'Frage'])
      ->addTextAreaField('answer', ['label' => 'Antwort'])
    , true, true, ['min' => 2, 'max' => 12])
    ->show();
} else { ?>
<fieldset><legend>FAQ <small>(MForm nicht aktiv)</small></legend>
  <label>FAQ-Titel</label><input class="form-control" type="text" name="REX_INPUT_VALUE[1]" value="REX_VALUE[1]" />
  <label>Items (JSON)</label><textarea class="form-control" name="REX_INPUT_VALUE[2]" rows="6">REX_VALUE[2]</textarea>
  <small>Format: [{"question":"...", "answer":"..."}, ...]</small>
</fieldset>
<?php } ?>`,
  output: `<?php
$title = 'REX_VALUE[1]';
$items = json_decode('REX_VALUE[2]', true) ?: [];
?>
<section class="section section--faq" id="faq">
  <div class="container">
    <?php if ($title): ?><h2 class="section__title"><?= rex_escape($title) ?></h2><?php endif; ?>
    <div class="faq-list">
      <?php foreach ($items as $i => $item): ?>
      <details class="faq-item">
        <summary class="faq-item__question"><?= rex_escape($item['question'] ?? '') ?></summary>
        <div class="faq-item__answer"><?= rex_escape($item['answer'] ?? '') ?></div>
      </details>
      <?php endforeach; ?>
    </div>
  </div>
</section>`,
}
