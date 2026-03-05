# Backup-Konzept

**Verantwortlich:** Robin Herbeck

**Stand:** März 2026

**Server:** rhdemo.de (Debian 12, Hetzner Dedicated Server)

---

## 1. Übersicht

| Eigenschaft | Wert |
|---|---|
| Backup-Zeitpunkt | Täglich, 03:00 Uhr |
| Methode | Automatisierter Cronjob (root) |
| Speicherort | `/home/deploy/backups/` (lokal auf dem Server) |
| Aufbewahrungsdauer | 7 Tage (rollierende Löschung) |
| Durchschnittliche Größe | ~424 MB pro Backup |
| Backup-Script | `/home/deploy/backups/backup.sh` |

---

## 2. Gesicherte Daten

| Komponente | Beschreibung | Methode |
|---|---|---|
| MariaDB-Datenbanken | Alle Datenbanken (WordPress, Nextcloud etc.) | `mysqldump` |
| Gitea | Repositories und Konfiguration (`/opt/gitea/data`) | Dateikopie |
| Nextcloud | Nutzerdaten und Konfiguration | Dateikopie |
| Umami (Analytics) | Datenbank und Konfiguration | Dateikopie |
| Dashboard-Daten | `data/projects.json`, `data/config.json`, `data/deploy-history.json`, Deploy-Logs | Dateikopie |
| nginx-Konfigurationen | `/etc/nginx/sites-available/` | Dateikopie |
| Webhook-Server | Konfiguration und Script | Dateikopie |

---

## 3. Backup-Ablauf

1. Cronjob startet `/home/deploy/backups/backup.sh` als root
2. Neues Backup-Verzeichnis mit Tagesdatum wird erstellt
3. MariaDB-Datenbanken werden per `mysqldump` exportiert
4. Dateien der Anwendungen werden kopiert
5. Backups älter als 7 Tage werden automatisch gelöscht

---

## 4. Wiederherstellung

### 4.1 Datenbank

```bash
mysql < /home/deploy/backups/YYYY-MM-DD/datenbank.sql
```

### 4.2 Dateien

Dateien können direkt aus dem Backup-Verzeichnis an den Originalort kopiert werden.

### 4.3 Geschätzte Wiederherstellungszeit

- Einzelne Datenbank: < 15 Minuten
- Einzelne Anwendung: < 30 Minuten
- Gesamtes System: < 24 Stunden

---

## 5. Einschränkungen und offene Punkte

- **Kein Offsite-Backup:** Backups liegen aktuell nur lokal auf dem Server. Bei Hardware-Ausfall oder Totalverlust des Servers gehen auch die Backups verloren.
- **Empfehlung:** Regelmäßige Kopie der Backups auf einen externen Speicher (z.B. Hetzner Storage Box, S3-kompatibler Speicher).
- **Kein Integritätscheck:** Es wird aktuell nicht automatisch geprüft, ob Backups erfolgreich und vollständig sind.
- **Empfehlung:** Monitoring des Backup-Scripts mit Benachrichtigung bei Fehler.

---

## 6. Verantwortlichkeiten

| Aufgabe | Verantwortlich | Intervall |
|---|---|---|
| Backup-Durchführung | Automatisch (Cronjob) | Täglich |
| Überprüfung der Backups | Robin Herbeck | Monatlich |
| Test-Wiederherstellung | Robin Herbeck | Vierteljährlich |
| Aktualisierung dieses Dokuments | Robin Herbeck | Bei Änderungen |

---

## Änderungshistorie

| Datum | Änderung |
|---|---|
| März 2026 | Erstfassung |
