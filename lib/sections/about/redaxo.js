// Redaxo Modul: Ueber uns

export default {
  title: 'Ueber uns',
  input: `<?php
if (class_exists('FriendsOfRedaxo\\MForm')) {
  echo FriendsOfRedaxo\\MForm::factory()
    ->addTextField(1.0, ['label' => 'Titel'])
    ->addTextAreaField(2.0, ['label' => 'Text'])
    ->addRepeaterElement(3, FriendsOfRedaxo\\MForm::factory()
      ->addTextField('text', ['label' => 'Highlight-Punkt'])
    , true, true, ['min' => 1, 'max' => 8])
    ->show();
} else { ?>
<fieldset><legend>Ueber uns <small>(MForm nicht aktiv)</small></legend>
  <label>Titel</label><input class="form-control" type="text" name="REX_INPUT_VALUE[1]" value="REX_VALUE[1]" />
  <label>Text</label><textarea class="form-control" name="REX_INPUT_VALUE[2]" rows="4">REX_VALUE[2]</textarea>
  <label>Highlights (JSON)</label><textarea class="form-control" name="REX_INPUT_VALUE[3]" rows="4">REX_VALUE[3]</textarea>
  <small>Format: [{"text":"Highlight 1"}, {"text":"Highlight 2"}, ...]</small>
</fieldset>
<?php } ?>`,
  output: `<?php
$title = 'REX_VALUE[1]';
$text = 'REX_VALUE[2]';
$highlights = json_decode('REX_VALUE[3]', true) ?: [];
?>
<section class="section section--about" id="about">
  <div class="container about__grid">
    <div class="about__content">
      <?php if ($title): ?><h2 class="section__title"><?= rex_escape($title) ?></h2><?php endif; ?>
      <?php if ($text): ?><p class="about__text"><?= rex_escape($text) ?></p><?php endif; ?>
    </div>
    <?php if ($highlights): ?>
    <div class="about__highlights">
      <?php foreach ($highlights as $hl): ?>
      <div class="highlight-item"><span class="highlight-item__check">&#10003;</span> <?= rex_escape(is_array($hl) ? ($hl['text'] ?? '') : $hl) ?></div>
      <?php endforeach; ?>
    </div>
    <?php endif; ?>
  </div>
</section>`,
}
