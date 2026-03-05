// Laravel Install-Steps

import { createDatabase } from '../database'
import { generateStarterContent } from '../ai-generate'
import { getGitUrl, getGitConf } from './shared'

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
    cmd: `cd ${projectPath} && sed -i "s|DB_CONNECTION=.*|DB_CONNECTION=mysql|" .env && sed -i "s|.*DB_HOST=.*|DB_HOST=127.0.0.1|" .env && sed -i "s|.*DB_PORT=.*|DB_PORT=3306|" .env && sed -i "s|.*DB_DATABASE=.*|DB_DATABASE=${database.name}|" .env && sed -i "s|.*DB_USERNAME=.*|DB_USERNAME=${database.user}|" .env && sed -i "s|.*DB_PASSWORD=.*|DB_PASSWORD=${database.password}|" .env && sed -i "s|APP_URL=.*|APP_URL=https://${domain}|" .env && php artisan key:generate && php artisan migrate --force`
  })

  // 4. Schreibbare Verzeichnisse fuer PHP-FPM
  steps.push({
    name: 'Berechtigungen setzen',
    cmd: `chmod -R 777 ${projectPath}/storage ${projectPath}/bootstrap/cache 2>/dev/null; echo "Berechtigungen gesetzt"`
  })

  // 5. AI Starter Content (optional)
  const laravelAiStep = getAiStep(project)
  if (laravelAiStep) steps.push(laravelAiStep)

  // 6. Git Push
  steps.push({
    name: 'Git Push (Laravel)',
    cmd: `cd ${projectPath} && git init -b main && git add -A && git ${getGitConf()} commit -m "Laravel Installation" && git remote add origin ${gitUrl} && git push -u origin main --force`
  })

  return { steps, info: { note: 'Laravel ist bereit' } }
}
