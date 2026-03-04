// ============================================================
// REDAXO ADDONS — einfach erweiterbar: Eintrag hinzufuegen, fertig
// Wird von install/redaxo.js (Download) und config.yml (system_addons) genutzt
// ============================================================

export const REDAXO_ADDONS = [
  { name: 'mform', repo: 'FriendsOfREDAXO/mform', desc: 'Formular-Builder mit Repeater' },
  { name: 'adminer', repo: 'FriendsOfREDAXO/adminer', desc: 'Datenbank-Verwaltung im Backend' },
  { name: 'developer', repo: 'FriendsOfREDAXO/developer', desc: 'Template/Modul-Sync zum Dateisystem' },
  { name: 'cke5', repo: 'FriendsOfREDAXO/cke5', desc: 'WYSIWYG Editor (CKEditor 5)' },
]

// ============================================================
// BOOT.PHP — Auto-Installer fuer project-Addon
// ============================================================

export const BOOT_PHP = `<?php
// Auto-Installer: MForm sicherstellen + setup.php ausfuehren
if (rex::isBackend() && rex::getUser()) {
    // MForm auto-aktivieren falls vorhanden aber nicht aktiv
    $mform = rex_addon::get('mform');
    if ($mform->isSystemPackage() || is_dir(rex_path::addon('mform'))) {
        try {
            if (!$mform->isInstalled()) {
                $mform->install();
            }
            if (!$mform->isAvailable()) {
                $mform->activate();
            }
        } catch (\\Throwable $e) {
            rex_logger::logException($e);
        }
    }

    // Module erstellen falls noch keine existieren
    $sql = rex_sql::factory();
    $modules = $sql->getArray("SELECT id FROM " . rex::getTable('module') . " LIMIT 1");
    if (empty($modules)) {
        $setupFile = __DIR__ . '/lib/setup.php';
        if (file_exists($setupFile)) {
            try {
                include $setupFile;
            } catch (\\Throwable $e) {
                rex_logger::logException($e);
                echo 'Setup-Fehler: ' . $e->getMessage();
            }
        }
    }
}
`

// ============================================================
// CONFIG.YML GENERATOR — Redaxo-Konfiguration fuer automatisches Setup
// ============================================================

export function generateConfigYml({ domain, name, dbHost, dbUser, dbPassword, dbName, setupDone = false }) {
  const instname = 'rex' + Date.now()
  return `setup: ${setupDone ? 'false' : 'true'}
live_mode: false
safe_mode: false
debug:
    enabled: false
    throw_always_exception: false
instname: '${instname}'
server: 'https://${domain}/'
servername: '${name}'
error_email: 'info@robinherbeck.com'
fileperm: '0664'
dirperm: '0775'
timezone: Europe/Berlin
session_duration: 7200
session_cookie:
    frontend:
        lifetime: null
        path: null
        domain: null
        secure: null
        httponly: true
        samesite: Lax
    backend:
        lifetime: null
        path: null
        domain: null
        secure: null
        httponly: true
        samesite: Lax
db:
    1:
        host: '${dbHost}'
        login: '${dbUser}'
        password: '${dbPassword}'
        name: '${dbName}'
        persistent: false
        ssl_key: null
        ssl_cert: null
        ssl_ca: null
        ssl_verify_server_cert: true
table_prefix: rex_
temp_prefix: tmp_
use_https: true
use_hsts: false
hsts_max_age: 31536000
use_gzip: false
use_etag: true
use_last_modified: true
start_page: structure
password_policy:
    length:
        min: 8
        max: 4096
backend_login_policy:
    login_tries_until_blocked: 50
    login_tries_until_delay: 3
    relogin_delay: 5
    enable_stay_logged_in: true
lang: de_de
lang_fallback:
    - en_gb
    - de_de
use_accesskeys: true
accesskeys:
    save: s
    apply: x
    delete: d
    add: a
    add_2: 'y'
editor: null
editor_basepath: null
setup_addons:
    - backup
    - be_style
system_addons:
    - backup
    - mediapool
    - structure
    - metainfo
    - be_style
    - media_manager
    - users
    - install
${REDAXO_ADDONS.map(a => `    - ${a.name}`).join('\n')}
    - project
`
}

// Default-Testinhalte fuer Redaxo (wenn keine AI-Beschreibung vorhanden)
export const DEFAULT_REDAXO_CONTENT = {
  theme: { primary: '#1e40af', secondary: '#7c3aed', mode: 'light', font: 'system' },
  sections: [
    { type: 'hero', data: { title: 'Willkommen', subtitle: 'Ihre professionelle Webpraesenz — modern, schnell und zuverlaessig', ctaText: 'Mehr erfahren' } },
    { type: 'features', data: { title: 'Unsere Leistungen', items: [
      { icon: '\u26a1', title: 'Schnell', text: 'Blitzschnelle Ladezeiten dank optimierter Technik' },
      { icon: '\ud83c\udfa8', title: 'Modern', text: 'Zeitgemaesses Design nach aktuellen Standards' },
      { icon: '\ud83d\udcf1', title: 'Responsiv', text: 'Optimiert fuer alle Geraete und Bildschirmgroessen' },
    ] } },
    { type: 'about', data: { title: 'Ueber uns', text: 'Wir sind ein erfahrenes Team mit Leidenschaft fuer Qualitaet und Innovation. Seit ueber 10 Jahren realisieren wir erfolgreiche Webprojekte.', highlights: ['10+ Jahre Erfahrung', '100+ zufriedene Kunden', 'Persoenliche Betreuung'] } },
    { type: 'stats', data: { items: [
      { value: '500+', label: 'Projekte' },
      { value: '10+', label: 'Jahre' },
      { value: '99%', label: 'Zufriedenheit' },
      { value: '24/7', label: 'Support' },
    ] } },
    { type: 'contact', data: { title: 'Kontakt', phone: '+49 123 456789', email: 'info@example.com', address: 'Musterstr. 1, 12345 Berlin' } },
  ]
}
