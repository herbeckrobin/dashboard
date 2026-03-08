// Next.js Starter Install-Steps

import crypto from 'crypto'
import { runCommand, runCommandLive } from '../run-command'
import { generateStarterContent } from '../ai-generate'
import { getConfig } from '../config.js'
import { getGitUrl, getGitCredentialHelper } from './shared'

function getAiStep(project) {
  if (!project.aiDescription) return null
  const projectPath = `/home/deploy/apps/${project.name}`

  return {
    name: 'AI Starter Content generieren',
    run: async (onOutput) => {
      try {
        const config = getConfig()
        let designBrief = null
        let totalCostUsd = 0

        // Agent Mode: Claude Agent SDK (autonom, iterativ)
        if (config.aiAgentMode && config.aiProvider === 'anthropic') {
          if (onOutput) onOutput('→ Agent Mode aktiviert\n')

          // Design-Recherche (WebSearch + WebFetch)
          try {
            const { runDesignResearch } = await import('../ai/research.js')
            designBrief = await runDesignResearch(project.aiDescription, onOutput)
            if (designBrief?.costUsd) totalCostUsd += designBrief.costUsd
          } catch (e) {
            if (onOutput) onOutput(`→ Design-Recherche uebersprungen: ${e.message}\n`)
          }

          // Dynamischer Import — vermeidet Webpack-Fehler (Agent SDK ist rein serverseitig)
          const { generateWithAgent } = await import('../ai/agent-generate.js')
          const agentResult = await generateWithAgent(project, projectPath, designBrief, onOutput)
          if (agentResult.costUsd) totalCostUsd += agentResult.costUsd
          if (agentResult.success) {
            if (onOutput) onOutput('→ Agent Mode erfolgreich\n')
            return { ...agentResult, costUsd: totalCostUsd }
          }
          // Fallback auf Standard-Modus
          if (onOutput) onOutput(`→ Agent fehlgeschlagen (${agentResult.error}), nutze Standard-Modus...\n`)
        }

        // Standard-Modus: Single-Shot API-Call (mit Design-Brief falls vorhanden)
        const result = await generateStarterContent(project, null, designBrief)
        if (result.costUsd) totalCostUsd += result.costUsd
        if (!result.success) {
          return { success: true, costUsd: totalCostUsd, output: `AI uebersprungen: ${result.error}` }
        }
        // Hybrid/Registry-Status loggen
        if (onOutput && result.hybrid !== undefined) {
          onOutput(result.hybrid ? '→ Hybrid-Modus (AI-generierte Komponenten)\n' : '→ Registry-Modus (vorgefertigte Komponenten)\n')
        }
        return { ...result, costUsd: totalCostUsd }
      } catch (err) {
        return { success: true, output: `AI uebersprungen: ${err.message}` }
      }
    }
  }
}

export function getNextjsStarterSteps(project) {
  const { name } = project
  const projectPath = `/home/deploy/apps/${name}`
  const gitUrl = getGitUrl(project.repo)
  const steps = []

  // 1. Next.js Starter Dateien programmatisch erstellen
  const config = getConfig()
  const isAgentMode = config.aiAgentMode && config.aiProvider === 'anthropic' && project.aiDescription

  steps.push({
    name: 'Next.js Starter erstellen',
    run: async () => {
      const fs = await import('fs')
      const path = await import('path')

      await runCommand(`rm -rf ${projectPath}`)

      if (isAgentMode) {
        // Agent Mode: Minimaler Starter — Agent erstellt alles selbst
        const dirs = ['app', 'public']
        for (const dir of dirs) {
          fs.mkdirSync(path.join(projectPath, dir), { recursive: true })
        }
      } else {
        // Standard-Modus: Volles Scaffold mit Sections, Navbar, Footer etc.
        var { SECTION_COMPONENTS, NAVBAR, FOOTER, SCROLL_REVEAL, SHARED_STYLES } = await import('../sections/index.js')

        const sectionNames = Object.keys(SECTION_COMPONENTS).map(n => n.toLowerCase())
        const dirs = [
          'app', 'lib', 'public', 'styles',
          'components/nav', 'components/footer', 'components/scroll-reveal',
          ...sectionNames.map(n => `blocks/${n}`)
        ]
        for (const dir of dirs) {
          fs.mkdirSync(path.join(projectPath, dir), { recursive: true })
        }
      }

      // package.json — Agent Mode: nur sass, Standard: Tailwind + sass
      const devDeps = isAgentMode
        ? { typescript: '5.6.2', '@types/node': '20.17.6', '@types/react': '19.0.2', '@types/react-dom': '19.0.1', sass: '1.77.0' }
        : { typescript: '5.6.2', '@types/node': '20.17.6', '@types/react': '19.0.2', '@types/react-dom': '19.0.1', tailwindcss: '3.4.17', postcss: '8.4.47', autoprefixer: '10.4.20', sass: '1.77.0' }
      fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
        name: 'nextjs-starter',
        version: '0.1.0',
        private: true,
        scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
        dependencies: { next: '15.1.0', react: '19.0.0', 'react-dom': '19.0.0' },
        devDependencies: devDeps,
      }, null, 2))

      // next.config.js
      fs.writeFileSync(path.join(projectPath, 'next.config.js'),
`/** @type {import('next').NextConfig} */
module.exports = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true }
}
`)

      // tsconfig.json
      fs.writeFileSync(path.join(projectPath, 'tsconfig.json'),
        '{"compilerOptions":{"target":"ES2020","lib":["ES2020","DOM","DOM.Iterable"],"jsx":"preserve","module":"ESNext","moduleResolution":"bundler","baseUrl":".","paths":{"@/*":["./*"]},"noUnusedLocals":false,"noUnusedParameters":false},"include":["**/*.ts","**/*.tsx"],"exclude":["node_modules"]}')

      // Tailwind + PostCSS nur fuer Standard-Modus
      if (!isAgentMode) {
        fs.writeFileSync(path.join(projectPath, 'tailwind.config.js'),
`/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './blocks/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
      }
    }
  },
  plugins: []
}
`)
        fs.writeFileSync(path.join(projectPath, 'postcss.config.js'),
`module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  }
}
`)
      }

      // app/globals.scss — Agent Mode: SCSS-Reset, Standard: Tailwind + CSS Variables
      const globalsScss = isAgentMode
        ? `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }\nhtml { scroll-behavior: smooth; }\nbody { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }\nimg { max-width: 100%; height: auto; display: block; }\na { text-decoration: none; color: inherit; }\nbutton { cursor: pointer; border: none; background: none; font: inherit; }\n`
        : `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n:root {\n  --color-primary: 37 99 235;\n  --color-secondary: 124 58 237;\n  --color-bg: #ffffff;\n  --color-surface: #f9fafb;\n  --color-surface-alt: #f3f4f6;\n  --color-text: #111827;\n  --color-text-muted: #6b7280;\n  --color-text-inverted: #ffffff;\n  --color-accent: #2563eb;\n  --color-border: #e5e7eb;\n  --font-body: system-ui, -apple-system, sans-serif;\n}\n\nhtml { scroll-behavior: smooth; }\n*, *::before, *::after { box-sizing: border-box; }\n\nbody {\n  font-family: var(--font-body);\n  margin: 0;\n  padding: 0;\n  background: var(--color-bg);\n  color: var(--color-text);\n}\n`
      fs.writeFileSync(path.join(projectPath, 'app/globals.scss'), globalsScss)

      // app/layout.tsx
      fs.writeFileSync(path.join(projectPath, 'app/layout.tsx'),
`import './globals.scss'

export const metadata = { title: 'Next.js', description: '' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}
`)

      // app/page.tsx (Platzhalter — wird von AI ueberschrieben)
      fs.writeFileSync(path.join(projectPath, 'app/page.tsx'),
`export default function Home() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>Next.js Starter</h1>
    </main>
  )
}
`)

      // Standard-Modus: Scaffold mit Sections, Navbar, Footer, shared SCSS
      if (!isAgentMode) {
        // Shared SCSS
        for (const [name, content] of Object.entries(SHARED_STYLES)) {
          fs.writeFileSync(path.join(projectPath, `styles/${name}.scss`), content)
        }

        // Section-Komponenten
        for (const [name, { tsx, scss }] of Object.entries(SECTION_COMPONENTS)) {
          const dir = name.toLowerCase()
          fs.writeFileSync(path.join(projectPath, `blocks/${dir}/${name}.tsx`), tsx)
          fs.writeFileSync(path.join(projectPath, `blocks/${dir}/styles.scss`), scss)
        }

        // ScrollReveal
        fs.writeFileSync(path.join(projectPath, 'components/scroll-reveal/ScrollReveal.tsx'), SCROLL_REVEAL.tsx)
        fs.writeFileSync(path.join(projectPath, 'components/scroll-reveal/styles.scss'), SCROLL_REVEAL.scss)

        // Navbar
        fs.writeFileSync(path.join(projectPath, 'components/nav/Navbar.tsx'), NAVBAR.tsx)
        fs.writeFileSync(path.join(projectPath, 'components/nav/styles.scss'), NAVBAR.scss)

        // Footer
        fs.writeFileSync(path.join(projectPath, 'components/footer/Footer.tsx'), FOOTER.tsx)
        fs.writeFileSync(path.join(projectPath, 'components/footer/styles.scss'), FOOTER.scss)

        // lib/site-data.json
        fs.writeFileSync(path.join(projectPath, 'lib/site-data.json'), '{}')
      }

      // .gitignore
      fs.writeFileSync(path.join(projectPath, '.gitignore'), 'node_modules/\n.next/\n')

      return { success: true, output: isAgentMode ? 'Minimaler Next.js Starter erstellt (Agent Mode)' : 'Next.js Starter mit SCSS-Block-Struktur erstellt' }
    }
  })

  // 2. bun install mit Cache
  steps.push({
    name: 'Dependencies installieren (cached)',
    run: async (onOutput) => {
      const fs = await import('fs')

      const pkgContent = fs.readFileSync(`${projectPath}/package.json`, 'utf8')
      const pkgHash = crypto.createHash('md5').update(pkgContent).digest('hex').substring(0, 8)
      const cacheDir = `/home/deploy/cache/nextjs-starter-${pkgHash}`

      // Schnellster Weg: node_modules aus Cache-Verzeichnis kopieren (cp -al = hardlinks, instant)
      const cacheCheck = await runCommand(`test -d ${cacheDir}/node_modules && echo "hit"`)
      if (cacheCheck.success && cacheCheck.output.includes('hit')) {
        if (onOutput) onOutput('node_modules aus Cache verlinken...\n')
        const cpResult = await runCommand(`cp -al ${cacheDir}/node_modules ${projectPath}/node_modules && cp -f ${cacheDir}/bun.lock ${projectPath}/bun.lock 2>/dev/null; true`)
        if (cpResult.success) {
          return { success: true, output: 'node_modules aus Cache geladen (hardlinks, instant)' }
        }
        if (onOutput) onOutput('Hardlink fehlgeschlagen, bun install...\n')
      }

      // .env vor bun install umbenennen (Bun 1.3.x crasht bei .env-Dateien)
      const installResult = await runCommandLive(`cd ${projectPath} && if [ -f .env ]; then mv .env .env.bak; fi && bun install 2>&1; EXIT=$?; if [ -f .env.bak ]; then mv .env.bak .env; fi; exit $EXIT`, 300000, onOutput)
      if (!installResult.success) return installResult

      // Cache als Verzeichnis speichern (statt tar.gz — schneller beim Laden)
      if (onOutput) onOutput('node_modules cachen...\n')
      await runCommand(`rm -rf ${cacheDir} && mkdir -p ${cacheDir} && cp -al ${projectPath}/node_modules ${cacheDir}/node_modules && cp -f ${projectPath}/bun.lock ${cacheDir}/bun.lock 2>/dev/null; true`)
      // Alte Caches aufräumen
      await runCommand(`find /home/deploy/cache -maxdepth 1 -name "nextjs-starter-*" ! -name "nextjs-starter-${pkgHash}" -exec rm -rf {} + 2>/dev/null; true`)
      // Alte tar.gz Caches auch löschen
      await runCommand(`rm -f /home/deploy/cache/nextjs-starter-*.tar.gz 2>/dev/null; true`)

      return { success: true, output: 'bun install abgeschlossen + Cache erstellt' }
    }
  })

  // 3. AI Starter Content (optional)
  const nextAiStep = getAiStep(project)
  if (nextAiStep) steps.push(nextAiStep)

  // 4. Git Init + Commit
  steps.push({
    name: 'Git Init + Commit',
    cmd: `cd ${projectPath} && find node_modules -xtype l -delete 2>/dev/null; git init -b main && git config user.name "Deploy Dashboard" && git config user.email "deploy@${getConfig().serverDomain || 'localhost'}" && git add . && git commit -m "Next.js Starter"`
  })

  // 5. Git Push
  steps.push({
    name: 'Git Push (Next.js)',
    cmd: `cd ${projectPath} && git remote add origin ${gitUrl} && git ${getGitCredentialHelper()} push -u origin main --force`
  })

  return { steps, info: { note: 'Next.js Starter ist bereit' } }
}
