<div align="center">

# Cloud Server Manager

**Self-hosted Dashboard zur Verwaltung von Web-Projekten auf einem einzelnen Server.**

[![Next.js](https://img.shields.io/badge/Next.js_14-black?logo=next.js)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-Private-red)]()

</div>

---

> [!IMPORTANT]
> Dieses Repository allein ist **nicht lauffähig**. Der Server muss zuerst mit dem [`install.sh`](../install.sh) Script provisioniert werden (Debian 12+ / Ubuntu 22.04+). Ohne die damit installierten Services (nginx, MariaDB, Certbot, PM2, Docker, etc.) funktioniert das Dashboard nicht.

---

## Was es kann

- **Projekt-Deployment** — Git-Push zu Gitea löst automatischen Build + Deploy aus
- **Framework-Installation** — WordPress, TYPO3, Redaxo, Contao, Laravel, Next.js, Express mit einem Klick
- **Domain & SSL** — Automatische nginx-Config, DNS-Check, Let's Encrypt SSL mit Retry
- **Monitoring** — PageSpeed-Scores, Server-Systeminfo, Backup-Status
- **E-Mail** — Domain-Setup, DKIM, Accounts, Aliases, Queue-Monitoring
- **Sicherheit** — Passkeys (WebAuthn), TOTP 2FA, Rate Limiting

## Architektur

```
Git Push → Gitea → Webhook:9000 (HMAC-SHA256)
  → Dashboard API:3005
  → clone/pull → install → build → nginx → SSL → PM2
```

<details>
<summary><strong>Tech Stack</strong></summary>

| Komponente | Technologie |
|---|---|
| Frontend | Next.js 14 (Pages Router), React 18, Tailwind CSS |
| Auth | Passkeys + TOTP 2FA |
| Daten | JSON-Dateien (kein SQL) |
| Server | nginx, PM2, systemd |
| Package Manager | Bun |
| Containers | Gitea, n8n, Umami, Nextcloud (Docker) |
| DB | MariaDB (nur für WordPress/Nextcloud) |

</details>

<details>
<summary><strong>API Endpoints (Auszug)</strong></summary>

| Endpoint | Funktion |
|---|---|
| `POST /api/projects/[id]/deploy` | Deployment starten |
| `GET /api/projects` | Alle Projekte auflisten |
| `GET /api/system-info` | Server-Status |
| `GET /api/summary` | n8n Integration |
| `GET /api/alerts` | n8n Alerts |

45+ Endpoints für Projekt-, Domain-, E-Mail- und System-Verwaltung.

</details>


## Struktur

```
dashboard/
├── pages/api/     # 45+ REST API Endpoints
├── lib/
│   ├── deploy.js  # Deploy-Logik + nginx-Config
│   ├── install/   # Framework-Installer (WP, TYPO3, ...)
│   ├── auth.js    # Passkeys + 2FA
│   └── sections/  # AI Content Section Registry
├── components/    # React UI Components
└── data/          # JSON Storage (projects, config, logs)
```

---

<div align="center">
<sub>Built for managing multiple web projects on a single Debian server.</sub>
</div>
