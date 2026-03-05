// Contao Install-Steps

import fs from 'fs'
import path from 'path'
import { createDatabase } from '../database'
import { generateStarterContent } from '../ai-generate'
import { generateThemeCSS, generateContentSQL, generateMainJs, DEFAULT_CONTAO_CONTENT } from '../contao-scaffold/index.js'
import { getGoogleFontsUrl } from '../theme-defaults.js'
import { randomPassword, getGitUrl, getGitConf } from './shared'
import { getAdminEmail } from '../config.js'

function getAiStep(project) {
  if (!project.aiDescription) return null
  return {
    name: 'AI Starter Content generieren',
    run: async () => {
      try {
        const result = await generateStarterContent(project)
        if (!result.success) {
          return { success: true, costUsd: result.costUsd, output: `AI uebersprungen: ${result.error}` }
        }
        return result
      } catch (err) {
        return { success: true, output: `AI uebersprungen: ${err.message}` }
      }
    }
  }
}

export function getContaoSteps(project) {
  const { name, domain, database } = project
  const projectPath = `/home/deploy/apps/${name}`
  const gitUrl = getGitUrl(project.repo)
  const adminPassword = randomPassword()
  const steps = []

  // 1. DB erstellen
  steps.push({
    name: 'Datenbank erstellen',
    run: async () => createDatabase(database)
  })

  // 2. Contao via Composer installieren
  // block-insecure deaktivieren, da Contao-Versionen Security Advisories haben
  // die noch nicht in allen Patch-Versionen gefixt sind
  steps.push({
    name: 'Contao installieren',
    cmd: `sudo rm -rf ${projectPath} && composer config -g audit.block-insecure false && composer create-project contao/managed-edition ${projectPath} "^5" --no-interaction --prefer-dist && composer config -g --unset audit.block-insecure`
  })

  // 3. .env.local mit Datenbank-Credentials + App-Secret schreiben
  steps.push({
    name: 'Datenbank konfigurieren',
    run: async () => {
      const envContent = [
        `DATABASE_URL=mysql://${database.user}:${database.password}@${database.host}:3306/${database.name}?charset=utf8mb4`,
        `APP_SECRET=${randomPassword(32)}`,
        `APP_ENV=prod`,
      ].join('\n') + '\n'
      fs.writeFileSync(`${projectPath}/.env.local`, envContent)
      return { success: true, output: '.env.local mit DB-Credentials geschrieben' }
    }
  })

  // 4. Datenbank-Migration (Schema erstellen)
  steps.push({
    name: 'Datenbank migrieren',
    cmd: `cd ${projectPath} && vendor/bin/contao-console contao:migrate --no-interaction`
  })

  // 5. Admin-Benutzer erstellen
  steps.push({
    name: 'Admin-Benutzer erstellen',
    cmd: `cd ${projectPath} && echo "de" | vendor/bin/contao-console contao:user:create --username=admin --name=Admin --email=${getAdminEmail()} --password="${adminPassword}" --admin`
  })

  // 6. AI Starter Content ODER Default-Content
  const aiStep = getAiStep(project)
  if (aiStep) {
    steps.push(aiStep)
  } else {
    steps.push({
      name: 'Standard-Startseite generieren',
      run: async () => {
        const siteData = DEFAULT_CONTAO_CONTENT
        const sectionsCss = siteData.sections.map(s => `\n/* Section: ${s.id} */\n${s.css}`).join('\n')
        const fullCSS = generateThemeCSS(siteData.theme, sectionsCss)

        // CSS + JS schreiben
        const cssDir = path.join(projectPath, 'files', 'theme')
        fs.mkdirSync(cssDir, { recursive: true })
        fs.writeFileSync(path.join(cssDir, 'style.css'), fullCSS, 'utf8')
        fs.writeFileSync(path.join(cssDir, 'main.js'), generateMainJs(), 'utf8')
        fs.writeFileSync(path.join(cssDir, '.public'), '', 'utf8')

        // SQL-Datei schreiben
        const googleFontsUrl = getGoogleFontsUrl(siteData.theme?.font)
        const sql = generateContentSQL(siteData.sections, name, googleFontsUrl, getAdminEmail())
        fs.writeFileSync(path.join(projectPath, 'setup-content.sql'), sql, 'utf8')

        return { success: true, output: 'Standard-Startseite mit 5 Sections vorbereitet (Hero, Features, About, Stats, Contact)' }
      }
    })
  }

  // 7. Content einfuegen (SQL ausfuehren)
  steps.push({
    name: 'Startseite einrichten',
    cmd: `cd ${projectPath} && mysql --default-character-set=utf8mb4 -u ${database.user} -p"${database.password}" ${database.name} < setup-content.sql && rm setup-content.sql && echo "Content eingefuegt"`
  })

  // 8. Symlinks erstellen (public/files, public/assets, etc.)
  steps.push({
    name: 'Symlinks erstellen',
    cmd: `cd ${projectPath} && vendor/bin/contao-console contao:symlinks && echo "Symlinks erstellt"`
  })

  // 9. Contao Cache leeren
  steps.push({
    name: 'Cache leeren',
    cmd: `cd ${projectPath} && vendor/bin/contao-console cache:clear --no-warmup && vendor/bin/contao-console cache:warmup && echo "Cache geleert"`
  })

  // 10. Schreibbare Verzeichnisse fuer PHP-FPM
  steps.push({
    name: 'Berechtigungen setzen',
    cmd: `sudo chown -R deploy:www-data ${projectPath} && sudo chmod -R g+w ${projectPath}/var ${projectPath}/files ${projectPath}/assets && sudo find ${projectPath}/var ${projectPath}/files ${projectPath}/assets -type d -exec chmod g+s {} + && echo "Berechtigungen gesetzt"`
  })

  // 11. Git Push
  steps.push({
    name: 'Git Push (Contao)',
    cmd: `cd ${projectPath} && git init -b main && git add -A && git ${getGitConf()} commit -m "Contao Installation" && git remote add origin ${gitUrl} && git push -u origin main --force`
  })

  return {
    steps,
    info: {
      adminPassword,
      adminUrl: `https://${domain}/contao/`,
      note: 'Contao 5 Backend erreichbar unter /contao/ (Admin: admin)'
    }
  }
}
