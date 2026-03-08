import { requireAuth } from '../../../../lib/auth'
import fs from 'fs'
import { getProject, updateProject } from '../../../../lib/db'
import { runCommand } from '../../../../lib/run-command'
import { escapeShellArg } from '../../../../lib/validate'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return
  const { id } = req.query

  const project = getProject(id)
  if (!project) {
    return res.status(404).json({ error: 'Projekt nicht gefunden' })
  }

  // GET - Passwort-Status abrufen
  if (req.method === 'GET') {
    return res.json({
      passwordEnabled: project.passwordEnabled || false
    })
  }

  // POST - Passwort setzen/aktivieren
  if (req.method === 'POST') {
    const { password, enabled } = req.body

    if (enabled && (!password || password.length < 4)) {
      return res.status(400).json({ error: 'Passwort muss mindestens 4 Zeichen haben' })
    }

    const htpasswdPath = `/etc/nginx/htpasswd/${project.domain}`

    if (enabled && password) {
      // htpasswd-Verzeichnis sicherstellen
      await runCommand('sudo mkdir -p /etc/nginx/htpasswd')

      // htpasswd erstellen via temp-Datei + sudo mv
      const tmpHtpasswd = `/tmp/htpasswd-${project.domain}`
      const htResult = await runCommand(`htpasswd -cb ${escapeShellArg(tmpHtpasswd)} user ${escapeShellArg(password)}`)
      if (!htResult.success) {
        return res.status(500).json({ error: 'Fehler beim Erstellen der htpasswd: ' + htResult.error })
      }
      const mvResult = await runCommand(`sudo mv ${escapeShellArg(tmpHtpasswd)} ${escapeShellArg(htpasswdPath)}`)
      if (!mvResult.success) {
        return res.status(500).json({ error: 'Fehler beim Verschieben der htpasswd: ' + mvResult.error })
      }
    } else {
      // htpasswd entfernen
      await runCommand(`sudo rm -f ${escapeShellArg(htpasswdPath)}`)
    }

    // nginx config aktualisieren
    const authResult = await updateNginxWithAuth(project.domain, enabled)
    if (!authResult.success) {
      return res.status(500).json({ error: 'Fehler beim Aktualisieren der nginx-Config: ' + authResult.error })
    }

    // nginx neu laden
    const reloadResult = await runCommand('sudo nginx -t && sudo systemctl reload nginx')
    if (!reloadResult.success) {
      return res.status(500).json({ error: 'nginx Fehler: ' + reloadResult.error })
    }

    // Projekt aktualisieren
    updateProject(id, {
      passwordEnabled: enabled,
      password: null
    })

    return res.json({
      success: true,
      message: enabled ? 'Passwort-Schutz aktiviert' : 'Passwort-Schutz deaktiviert'
    })
  }

  res.status(405).json({ error: 'Method not allowed' })
}

async function updateNginxWithAuth(domain, enabled) {
  const configPath = `/etc/nginx/sites-available/${domain}`

  // Aktuelle Config lesen
  const readResult = await runCommand(`sudo cat ${escapeShellArg(configPath)}`)
  if (!readResult.success) return readResult

  let config = readResult.output

  if (enabled) {
    // Auth-Block hinzufügen falls nicht vorhanden
    if (!config.includes('auth_basic')) {
      config = config.replace(
        /location \/ \{/,
        `location / {\n        auth_basic "Passwort erforderlich";\n        auth_basic_user_file /etc/nginx/htpasswd/${domain};`
      )
    }
  } else {
    // Auth-Zeilen entfernen
    config = config.replace(/\n\s*auth_basic "Passwort erforderlich";/g, '')
    config = config.replace(/\n\s*auth_basic_user_file [^;]+;/g, '')
  }

  // Config schreiben via temp-Datei + sudo mv
  const tmpPath = `/tmp/nginx-${domain}.conf`
  fs.writeFileSync(tmpPath, config)
  return await runCommand(`sudo mv ${escapeShellArg(tmpPath)} ${escapeShellArg(configPath)}`)
}
