# Technische und organisatorische Maßnahmen (TOM)

gemäß Art. 32 DS-GVO

**Verantwortlich:** Robin Herbeck, Großgartacherstraße 148, 74080 Heilbronn

**Stand:** März 2026

**Server-Standort:** Deutschland (Hetzner Online GmbH, Dedicated Server)

---

## 1. Vertraulichkeit

### 1.1 Zutrittskontrolle (physisch)

Die physische Sicherheit der Server wird durch den Rechenzentrumsbetreiber (Hetzner Online GmbH) gewährleistet:

- Rechenzentren in Deutschland (Nürnberg, Falkenstein) und Finnland (Helsinki/Tuusula)
- Zutritt nur für autorisiertes Personal
- Videoüberwachung und Zutrittskontrollsysteme
- ISO 27001 zertifiziert (gültig bis September 2028)
- BSI C5 Typ 2 Testat (seit Dezember 2025)
- TÜV Rheinland Audit (Februar 2026): Keine Abweichungen festgestellt
- Details siehe [Hetzner TOM](TOM.pdf) und [TÜV-Audit-Bericht](dpa-tuev-audit-de.pdf)

### 1.2 Zugangskontrolle (logisch)

Maßnahmen zum Schutz vor unbefugtem Zugang zum System:

- **SSH-Zugang:** Ausschließlich per SSH-Key-Authentifizierung (`PermitRootLogin prohibit-password`), keine Passwort-Logins
- **SSH-Härtung:** `UseDNS no`, nur autorisierte Keys (`IdentitiesOnly yes`)
- **Firewall (UFW):** Nur Ports 22 (SSH), 80 (HTTP), 443 (HTTPS), 222 (Gitea SSH) geöffnet — alle anderen Ports blockiert
- **Fail2ban:** Automatische IP-Sperrung nach 5 fehlgeschlagenen SSH-Anmeldeversuchen (Sperrzeit: 1 Stunde)
- **Getrennte Benutzer:** Systemadministration (root) und Anwendungsbetrieb (deploy) sind getrennte Benutzerkonten
- **Dashboard-Authentifizierung:** Login mit Passwort, Passkeys (WebAuthn) und optionaler 2-Faktor-Authentifizierung

### 1.3 Zugriffskontrolle

Maßnahmen zur Sicherstellung, dass nur Berechtigte auf Daten zugreifen:

- **Rechteverwaltung:** Anwendungen laufen unter dem Benutzer `deploy` mit eingeschränkten sudo-Rechten
- **nginx:** Jede gehostete Website hat eine eigene nginx-Konfiguration mit isoliertem Document Root
- **Datenbanken:** Jede Anwendung erhält eigene MariaDB-Datenbank und eigenen Datenbankbenutzer
- **E-Mail:** DKIM-Signierung pro Domain, separate Konfiguration je Domain
- **Admin-Dashboard:** Nur über authentifizierten Zugang erreichbar

### 1.4 Trennungskontrolle

Maßnahmen zur getrennten Verarbeitung von Daten verschiedener Auftraggeber:

- Jedes Kundenprojekt hat ein eigenes Verzeichnis unter `/home/deploy/apps/`
- Eigene nginx-Konfiguration pro Projekt
- Eigene Datenbank pro Projekt (bei CMS-Anwendungen)
- Separate PM2-Prozesse für Node.js-Anwendungen

---

## 2. Integrität

### 2.1 Weitergabekontrolle

Maßnahmen zum Schutz bei der Datenübertragung:

- **SSL/TLS:** Alle Websites werden mit Let's Encrypt SSL-Zertifikaten ausgeliefert (automatische Erneuerung)
- **TLS-Versionen:** Mindestens TLS 1.2, TLS 1.0/1.1 deaktiviert
- **HTTPS-Redirect:** Automatische Weiterleitung von HTTP auf HTTPS
- **SSH:** Verschlüsselte Datenübertragung für Administration
- **Security Headers:** X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy auf allen Websites
- **nginx:** `server_tokens off` (keine Versionsinformation)

### 2.2 Eingabekontrolle

Nachvollziehbarkeit von Dateneingaben und -änderungen:

- **Deploy-Logs:** Jeder Deploy-Vorgang wird protokolliert (Zeitstempel, Schritte, Ergebnis)
- **Deploy-History:** Vollständige Änderungshistorie aller Projekte
- **Git-Versionierung:** Alle Code-Änderungen sind über Gitea versioniert und nachvollziehbar
- **Server-Logs:** nginx Access- und Error-Logs

---

## 3. Verfügbarkeit und Belastbarkeit

### 3.1 Verfügbarkeitskontrolle

Maßnahmen zum Schutz gegen Datenverlust:

- **Automatisierte Backups:** Tägliche Datensicherung um 03:00 Uhr (Cronjob)
- **Backup-Umfang:** MariaDB-Datenbanken, Anwendungsdaten, Gitea-Repositories, nginx-Konfigurationen, Dashboard-Daten
- **Aufbewahrung:** 7 Tage rotierende Backups
- **Details:** Siehe [Backup-Konzept](backup-konzept.md)

### 3.2 Wiederherstellbarkeit

- Backups ermöglichen Wiederherstellung innerhalb von 24 Stunden
- Systemd-Services starten automatisch nach Serverneustart
- PM2-Prozessmanager startet Anwendungen automatisch neu bei Absturz

### 3.3 Belastbarkeit

- Dedicated Server mit dedizierten Ressourcen (kein Shared Hosting)
- Automatische Sicherheitsupdates (Unattended Upgrades für Debian)
- Monitoring: Performance-Überwachung und Alerts über das Admin-Dashboard

---

## 4. Verfahren zur regelmäßigen Überprüfung

### 4.1 Datenschutz-Management

- Regelmäßige Überprüfung und Aktualisierung der TOM (mindestens jährlich)
- Dokumentation aller Verarbeitungstätigkeiten
- AVV mit Unterauftragsverarbeitern (Hetzner Online GmbH, unterzeichnet am 05.03.2026, siehe [Hetzner AVV](dpa-2026-03-05.pdf))

### 4.2 Incident-Response

- Überwachung der Server-Logs auf Anomalien
- Fail2ban-Benachrichtigungen bei Angriffsversuchen
- Alerting-System über n8n-Workflows (tägliche Checks, wöchentliche Zusammenfassungen)
- Meldung von Datenschutzverletzungen innerhalb von 24 Stunden an den Auftraggeber

---

## Änderungshistorie

| Datum | Änderung |
|---|---|
| März 2026 | Erstfassung |
