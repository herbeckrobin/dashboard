// Laravel Install-Steps

import fs from 'fs'
import { createDatabase } from '../database'
import { generateStarterContent } from '../ai-generate'
import { getGitUrl, getGitConf, getGitCredentialHelper } from './shared'

function getAiStep(project) {
  if (!project.aiDescription) return null
  return {
    name: 'AI Starter Content generieren',
    run: async () => {
      try {
        const result = await generateStarterContent(project)
        if (!result.success) {
          return { success: true, output: `AI uebersprungen: ${result.error}` }
        }
        return result
      } catch (err) {
        return { success: true, output: `AI uebersprungen: ${err.message}` }
      }
    }
  }
}

export function getLaravelSteps(project) {
  const { name, domain, database } = project
  const projectPath = `/home/deploy/apps/${name}`
  const gitUrl = getGitUrl(project.repo)
  const steps = []

  // 1. DB erstellen
  steps.push({
    name: 'Datenbank erstellen',
    run: async () => createDatabase(database)
  })

  // 2. Composer create-project (sudo rm fuer sauberen Start bei Retry)
  steps.push({
    name: 'Laravel installieren',
    cmd: `sudo rm -rf ${projectPath} && composer create-project laravel/laravel ${projectPath} --no-interaction`
  })

  // 3. .env konfigurieren + key:generate + migrate
  steps.push({
    name: 'Laravel konfigurieren',
    pre: () => {
      // .env sicher per Datei-Schreibzugriff aendern (kein sed mit User-Input)
      const envPath = `${projectPath}/.env`
      let env = fs.readFileSync(envPath, 'utf8')
      const replacements = {
        'DB_CONNECTION': 'mysql',
        'DB_HOST': '127.0.0.1',
        'DB_PORT': '3306',
        'DB_DATABASE': database.name,
        'DB_USERNAME': database.user,
        'DB_PASSWORD': database.password,
        'APP_URL': `https://${domain}`,
      }
      for (const [key, value] of Object.entries(replacements)) {
        const regex = new RegExp(`^[# ]*${key}=.*$`, 'm')
        if (regex.test(env)) {
          env = env.replace(regex, `${key}=${value}`)
        } else {
          env += `\n${key}=${value}`
        }
      }
      fs.writeFileSync(envPath, env)
    },
    cmd: `cd ${projectPath} && php artisan key:generate && php artisan migrate --force`
  })

  // 4. Schreibbare Verzeichnisse fuer PHP-FPM (775 + www-data statt 777)
  steps.push({
    name: 'Berechtigungen setzen',
    cmd: `chown -R deploy:www-data ${projectPath}/storage ${projectPath}/bootstrap/cache && chmod -R 775 ${projectPath}/storage ${projectPath}/bootstrap/cache 2>/dev/null; echo "Berechtigungen gesetzt"`
  })

  // 5. AI Starter Content (optional)
  const laravelAiStep = getAiStep(project)
  if (laravelAiStep) steps.push(laravelAiStep)

  // 6. Git Push
  steps.push({
    name: 'Git Push (Laravel)',
    cmd: `cd ${projectPath} && git init -b main && git add -A && git ${getGitConf()} commit -m "Laravel Installation" && git remote add origin ${gitUrl} && git ${getGitCredentialHelper()} push -u origin main --force`
  })

  return { steps, info: { note: 'Laravel ist bereit' } }
}
