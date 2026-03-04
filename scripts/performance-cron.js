#!/usr/bin/env node
// Woechentlicher Performance-Recheck fuer alle Projekte
// Usage: node scripts/performance-cron.js
// Cron: 0 2 * * 0 cd /home/deploy/apps/admin-dashboard && node scripts/performance-cron.js

const fs = require('fs')
const path = require('path')

const DASHBOARD_URL = 'http://localhost:3005'

async function main() {
  // Internal Token aus auth.json lesen
  const authPath = path.join(__dirname, '..', 'data', 'auth.json')
  let internalToken
  try {
    const authData = JSON.parse(fs.readFileSync(authPath, 'utf8'))
    internalToken = authData.internalToken
  } catch {
    console.error('Kann auth.json nicht lesen')
    process.exit(1)
  }

  if (!internalToken) {
    console.error('Kein internalToken in auth.json')
    process.exit(1)
  }

  // Alle Projekte abrufen
  const projectsRes = await fetch(`${DASHBOARD_URL}/api/projects`, {
    headers: { 'X-Internal-Token': internalToken }
  })
  const { projects } = await projectsRes.json()

  const eligible = projects.filter(p => p.domain && p.status !== 'error' && p.status !== 'pending')
  console.log(`${eligible.length} Projekte fuer Performance-Check gefunden`)

  for (const project of eligible) {
    console.log(`Pruefe: ${project.name} (${project.domain})`)
    try {
      const res = await fetch(`${DASHBOARD_URL}/api/projects/${project.id}/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': internalToken
        },
        body: JSON.stringify({ trigger: 'cron' })
      })
      const data = await res.json()
      console.log(`  -> ${data.success ? 'Gestartet' : 'Fehler: ' + data.error}`)

      // 90s warten zwischen Projekten (Server nicht ueberlasten)
      if (eligible.indexOf(project) < eligible.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 90000))
      }
    } catch (err) {
      console.error(`  -> Fehler: ${err.message}`)
    }
  }

  console.log('Fertig')
}

main().catch(console.error)
