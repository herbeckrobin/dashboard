// Dashboard Self-Update: git pull, bun install, bun run build, Service-Neustart
import { requireAuth } from '../../lib/auth'
import { runCommand } from '../../lib/run-command'

const DASHBOARD_DIR = '/home/deploy/apps/admin-dashboard'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Sofort antworten, Update laeuft im Hintergrund
  res.json({ success: true, message: 'Update gestartet' })

  try {
    // Code aktualisieren
    await runCommand(`cd ${DASHBOARD_DIR} && git fetch && git reset --hard origin/main`)

    // Dependencies installieren
    await runCommand(`cd ${DASHBOARD_DIR} && bun install`)

    // Neu bauen
    await runCommand(`cd ${DASHBOARD_DIR} && bun run build`, 600000)

    // Service neustarten
    await runCommand('sudo systemctl restart admin-dashboard')
  } catch (err) {
    console.error('Dashboard-Update fehlgeschlagen:', err.message)
  }
}
