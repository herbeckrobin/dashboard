// TYPO3 Install-Steps

import fs from 'fs'
import path from 'path'
import { createDatabase } from '../database'
import { generateStarterContent } from '../ai-generate'
import { generateThemeCSS, generateSitePackage, generateContentSQL, DEFAULT_TYPO3_CONTENT } from '../typo3-scaffold/index.js'
import { getGoogleFontsUrl } from '../theme-defaults.js'
import { randomPassword, getGitUrl, getGitConf } from './shared'
import { getAdminEmail } from '../config.js'
import { escapeShellArg } from '../validate.js'

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

export function getTypo3Steps(project) {
  const { name, domain, database } = project
  const projectPath = `/home/deploy/apps/${name}`
  const gitUrl = getGitUrl(project.repo)
  // TYPO3 verlangt mindestens ein Sonderzeichen im Passwort
  const adminPassword = randomPassword(14) + '!#'
  const steps = []

  // 1. DB erstellen
  steps.push({
    name: 'Datenbank erstellen',
    run: async () => createDatabase(database)
  })

  // 2. TYPO3 via Composer installieren (sudo rm fuer sauberen Start bei Retry)
  steps.push({
    name: 'TYPO3 installieren',
    cmd: `sudo rm -rf ${projectPath} && composer create-project typo3/cms-base-distribution ${projectPath} "^13" --no-interaction`
  })

  // 3. TYPO3 Setup via CLI (automatisiert ueber Umgebungsvariablen)
  steps.push({
    name: 'TYPO3 Setup',
    cmd: `cd ${projectPath} && TYPO3_DB_DRIVER=mysqli TYPO3_DB_HOST=${escapeShellArg(database.host)} TYPO3_DB_PORT=3306 TYPO3_DB_DBNAME=${escapeShellArg(database.name)} TYPO3_DB_USERNAME=${escapeShellArg(database.user)} TYPO3_DB_PASSWORD=${escapeShellArg(database.password)} TYPO3_SETUP_ADMIN_USERNAME=admin TYPO3_SETUP_ADMIN_PASSWORD=${escapeShellArg(adminPassword)} TYPO3_SETUP_ADMIN_EMAIL=${escapeShellArg(getAdminEmail())} TYPO3_SETUP_CREATE_SITE=${escapeShellArg('https://' + domain)} TYPO3_PROJECT_NAME=${escapeShellArg(name)} TYPO3_SERVER_TYPE=other vendor/bin/typo3 setup --force --no-interaction`
  })

  // 4. AI Starter Content ODER Default-Content
  const aiStep = getAiStep(project)
  if (aiStep) {
    steps.push(aiStep)
  } else {
    steps.push({
      name: 'Standard-Startseite generieren',
      run: async () => {
        const siteData = DEFAULT_TYPO3_CONTENT
        const sectionsCss = siteData.sections.map(s => `\n/* Section: ${s.id} */\n${s.css}`).join('\n')
        const fullCSS = generateThemeCSS(siteData.theme, sectionsCss)
        const googleFontsUrl = getGoogleFontsUrl(siteData.theme?.font)

        // Site Package schreiben
        const pkgDir = path.join(projectPath, 'packages', 'site_package')
        const files = generateSitePackage(name, fullCSS, googleFontsUrl)
        for (const file of files) {
          const fullPath = path.join(pkgDir, file.path)
          const dir = path.dirname(fullPath)
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
          fs.writeFileSync(fullPath, file.content, 'utf8')
        }

        // SQL-Datei schreiben
        const sql = generateContentSQL(siteData.sections, name)
        fs.writeFileSync(path.join(projectPath, 'setup-content.sql'), sql, 'utf8')

        return { success: true, output: 'Standard-Startseite mit 5 Sections vorbereitet (Hero, Features, About, Stats, Contact)' }
      }
    })
  }

  // 5. Site Package installieren
  steps.push({
    name: 'Site Package installieren',
    cmd: `cd ${projectPath} && composer config repositories.site_package path ./packages/site_package && composer require site/package:@dev --no-interaction`
  })

  // 6. Content einfuegen (SQL ausfuehren)
  steps.push({
    name: 'Startseite einrichten',
    cmd: `cd ${projectPath} && mysql --default-character-set=utf8mb4 -u ${escapeShellArg(database.user)} --password=${escapeShellArg(database.password)} ${escapeShellArg(database.name)} < setup-content.sql && rm setup-content.sql && echo "Content eingefuegt"`
  })

  // 7. TYPO3 Cache leeren
  steps.push({
    name: 'Cache leeren',
    cmd: `cd ${projectPath} && vendor/bin/typo3 cache:flush && echo "Cache geleert"`
  })

  // 8. Schreibbare Verzeichnisse fuer PHP-FPM
  steps.push({
    name: 'Berechtigungen setzen',
    cmd: `sudo chown -R deploy:www-data ${projectPath} && sudo chmod -R g+w ${projectPath}/var ${projectPath}/config ${projectPath}/public/fileadmin ${projectPath}/public/typo3temp && sudo find ${projectPath}/var ${projectPath}/config ${projectPath}/public/fileadmin ${projectPath}/public/typo3temp -type d -exec chmod g+s {} + && echo "Berechtigungen gesetzt"`
  })

  // 9. Git Push
  steps.push({
    name: 'Git Push (TYPO3)',
    cmd: `cd ${projectPath} && git init -b main && git add -A && git ${getGitConf()} commit -m "TYPO3 Installation" && git remote add origin ${gitUrl} && git push -u origin main --force`
  })

  return {
    steps,
    info: {
      adminPassword,
      adminUrl: `https://${domain}/typo3/`,
      note: 'TYPO3 v13 Backend erreichbar unter /typo3/ (Admin: admin)'
    }
  }
}
