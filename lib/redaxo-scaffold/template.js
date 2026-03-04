// ============================================================
// MAIN TEMPLATE — PHP-Grundgeruest (Navbar + Content + Footer)
// ============================================================

export function generateMainTemplate(siteName, googleFontsUrl = null) {
  const fontsLink = googleFontsUrl
    ? `\n  <link rel="preconnect" href="https://fonts.googleapis.com">\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n  <link rel="stylesheet" href="${googleFontsUrl}">`
    : ''
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= rex_escape(rex::getServerName()) ?> - <?= rex_escape($this->getValue('name')) ?></title>${fontsLink}
  <link rel="stylesheet" href="<?= rex_url::base('assets/css/style.css') ?>">
</head>
<body>
  <nav class="navbar" id="navbar">
    <div class="container navbar__inner">
      <a href="/" class="navbar__brand">${siteName}</a>
      <button class="navbar__toggle" onclick="document.querySelector('.navbar__menu').classList.toggle('navbar__menu--open')" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
      <ul class="navbar__menu">
        <li><a href="#hero">Start</a></li>
        <li><a href="#about">Ueber uns</a></li>
        <li><a href="#services">Leistungen</a></li>
        <li><a href="#kontakt">Kontakt</a></li>
      </ul>
    </div>
  </nav>

  <main>
    REX_ARTICLE[]
  </main>

  <footer class="footer">
    <div class="container footer__inner">
      <p>&copy; <?= date('Y') ?> ${siteName}. Alle Rechte vorbehalten.</p>
    </div>
  </footer>

  <script>
    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const el = document.querySelector(a.getAttribute('href'));
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      });
    });
    // Navbar scroll effect
    window.addEventListener('scroll', () => {
      document.getElementById('navbar').classList.toggle('navbar--scrolled', window.scrollY > 50);
    });
  </script>
</body>
</html>`
}
