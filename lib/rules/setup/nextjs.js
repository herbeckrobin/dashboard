// Next.js Setup-Rules

export default [
  {
    id: 'nextjs-scaffold',
    name: 'Next.js Projekt erstellt',
    category: 'setup',
    order: 20,
    scope: 'project',
    severity: 'critical',
    frameworks: ['nextjs-starter'],

    async audit({ project, runCmd }) {
      const path = `/home/deploy/apps/${project.name}`
      const exists = (await runCmd(`test -f ${path}/package.json && echo yes || echo no`)).trim()
      return {
        passed: exists === 'yes',
        actual: exists === 'yes' ? 'package.json vorhanden' : 'Fehlt',
        expected: 'Next.js Projekt',
      }
    },

    async enforce({ project, runCmd }) {
      // Pattern aus install/nextjs.js: Manuell erstellen (npx create-next-app hat Bug als deploy user)
      const path = `/home/deploy/apps/${project.name}`
      const fs = await import('fs')
      const pathMod = await import('path')

      fs.mkdirSync(pathMod.join(path, 'app'), { recursive: true })

      const pkg = {
        name: project.name,
        version: '0.1.0',
        private: true,
        scripts: { dev: 'next dev', build: 'next build', start: 'next start -p ' + project.port },
        dependencies: { next: '15.1.0', react: '19.0.0', 'react-dom': '19.0.0' },
      }
      fs.writeFileSync(pathMod.join(path, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')

      // Minimale App
      fs.writeFileSync(pathMod.join(path, 'app', 'layout.js'),
        `export const metadata = { title: '${project.name}' }\nexport default function RootLayout({ children }) { return <html><body>{children}</body></html> }\n`)
      fs.writeFileSync(pathMod.join(path, 'app', 'page.js'),
        `export default function Home() { return <main><h1>${project.name}</h1></main> }\n`)

      await runCmd(`cd ${path} && bun install`, { timeout: 60000 })
      return { changed: true }
    },
  },
]
