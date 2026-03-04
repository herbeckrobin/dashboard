// Projekt-Bearbeiten Seite

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import FileExplorer from '../../components/FileExplorer'
import GitCloneBox from '../../components/GitCloneBox'
import PasswordProtection from '../../components/PasswordProtection'
import EnvVars from '../../components/EnvVars'
import CollapsibleSection from '../../components/CollapsibleSection'
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs'

export default function EditProject() {
  const router = useRouter()
  const { id } = router.query

  const [form, setForm] = useState({ name: '', domain: '', type: 'php', repo: '', gitSubPath: '', uploadLimit: '', phpVersion: '8.2', docRoot: '', envVars: [], preBuildCmd: '', wwwAlias: false, performanceCheckEnabled: true, groupId: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deployHistory, setDeployHistory] = useState([])
  const [projectData, setProjectData] = useState(null)
  const [reinstalling, setReinstalling] = useState(false)
  const [groups, setGroups] = useState([])

  // Breadcrumb mit Projektname setzen
  useBreadcrumbs([{ label: form.name || 'Projekt', href: null }])

  useEffect(() => {
    if (!id) return

    fetch(`/api/projects/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.project) {
          setProjectData(data.project)
          setForm({
            name: data.project.name || '',
            domain: data.project.domain || '',
            type: data.project.type || 'php',
            repo: data.project.repo || '',
            gitSubPath: data.project.gitSubPath || '',
            uploadLimit: data.project.uploadLimit || '',
            phpVersion: data.project.phpVersion || '8.2',
            docRoot: data.project.docRoot || '',
            envVars: data.project.envVars || [],
            preBuildCmd: data.project.preBuildCmd || '',
            wwwAlias: data.project.wwwAlias || false,
            performanceCheckEnabled: data.project.performanceCheckEnabled !== false,
            groupId: data.project.groupId || ''
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))

    fetch(`/api/deploy-history?projectId=${id}&limit=10`)
      .then(res => res.json())
      .then(data => setDeployHistory(data.deploys || []))
      .catch(() => {})

    fetch('/api/groups').then(r => r.json()).then(d => setGroups(d.groups || [])).catch(() => {})
  }, [id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    setSaving(false)
    if (data.success) {
      router.push('/')
    } else {
      alert('Fehler: ' + (data.error || 'Unbekannter Fehler'))
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto"><p className="text-gray-400">Lädt...</p></div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 md:mb-8">Projekt bearbeiten</h1>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Projekt-Einstellungen */}
            <CollapsibleSection title="Projekt-Einstellungen" defaultOpen={true}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Projektname</label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full bg-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Domain</label>
                  <input type="text" value={form.domain} onChange={e => setForm({...form, domain: e.target.value})}
                    placeholder="example.rhdemo.de" className="w-full bg-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                  {form.domain && !form.domain.endsWith('.rhdemo.de') && (
                    <label className="flex items-center gap-2 cursor-pointer mt-2">
                      <input type="checkbox" checked={form.wwwAlias}
                        onChange={e => setForm({...form, wwwAlias: e.target.checked})}
                        className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500" />
                      <span className="text-sm text-gray-300">www.{form.domain} als Alias hinzufügen</span>
                    </label>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Typ</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                    className="w-full bg-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="php">PHP</option>
                    <option value="nextjs">Next.js</option>
                    <option value="node">Node.js</option>
                    <option value="static">Static</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Git Repository (Gitea)</label>
                  <input type="text" value={form.repo} onChange={e => setForm({...form, repo: e.target.value})}
                    placeholder="username/repo-name" className="w-full bg-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Git-Unterverzeichnis <span className="text-gray-500 font-normal">(optional)</span></label>
                  <input type="text" value={form.gitSubPath} onChange={e => setForm({...form, gitSubPath: e.target.value})}
                    placeholder="z.B. wp-content/themes/theme-name" className="w-full bg-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="text-gray-500 text-xs mt-1">Wenn das Git-Repo nur in einem Unterordner liegt (z.B. WordPress Themes)</p>
                </div>
                {groups.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Kunden-Gruppe</label>
                    <select value={form.groupId} onChange={e => setForm({...form, groupId: e.target.value})}
                      className="w-full bg-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Keine Gruppe</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name} ({g.package})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* Server-Einstellungen */}
            <CollapsibleSection title="Server-Einstellungen" defaultOpen={false}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Upload-Limit <span className="text-gray-500 font-normal">(optional)</span></label>
                  <input type="text" value={form.uploadLimit} onChange={e => setForm({...form, uploadLimit: e.target.value})}
                    placeholder="z.B. 150M" className="w-full bg-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="text-gray-500 text-xs mt-1">nginx client_max_body_size — leer lassen für nginx-Standard (1M)</p>
                </div>
                {form.type === 'php' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">PHP-Version</label>
                      <select value={form.phpVersion} onChange={e => setForm({...form, phpVersion: e.target.value})}
                        className="w-full bg-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="8.3">PHP 8.3</option>
                        <option value="8.2">PHP 8.2</option>
                        <option value="8.1">PHP 8.1</option>
                        <option value="8.0">PHP 8.0</option>
                        <option value="7.4">PHP 7.4</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Document Root <span className="text-gray-500 font-normal">(optional)</span></label>
                      <input type="text" value={form.docRoot} onChange={e => setForm({...form, docRoot: e.target.value})}
                        placeholder="z.B. public" className="w-full bg-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <p className="text-gray-500 text-xs mt-1">Unterverzeichnis als Document Root (z.B. public für Laravel)</p>
                    </div>
                  </>
                )}
              </div>
            </CollapsibleSection>

            {/* Monitoring & Variablen */}
            <CollapsibleSection title="Monitoring & Variablen" defaultOpen={false}>
              <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.performanceCheckEnabled}
                    onChange={e => setForm({...form, performanceCheckEnabled: e.target.checked})}
                    className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500" />
                  <span className="text-sm font-medium">Performance-Monitoring aktivieren</span>
                </label>
                <p className="text-gray-500 text-xs -mt-2">Wenn deaktiviert, werden Performance-Daten gelöscht und keine Alerts erzeugt</p>

                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-base font-semibold mb-1">Umgebungsvariablen</h3>
                  <p className="text-gray-500 text-xs mb-3">Werden als .env-Datei ins Projektverzeichnis geschrieben (vor dem Build)</p>
                  <EnvVars
                    value={form.envVars}
                    onChange={envVars => setForm({...form, envVars})}
                  />
                </div>

                {(form.type === 'nextjs' || form.type === 'node') && (
                  <div className="border-t border-gray-700 pt-4">
                    <h3 className="text-base font-semibold mb-1">Pre-Build Befehl</h3>
                    <input type="text" value={form.preBuildCmd}
                      onChange={e => setForm({...form, preBuildCmd: e.target.value})}
                      placeholder="z.B. bunx prisma generate"
                      className="w-full bg-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <p className="text-gray-500 text-xs mt-1">Wird nach bun install und vor bun run build ausgeführt</p>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </div>

          {/* Speichern/Abbrechen immer sichtbar */}
          <div className="flex gap-4 mt-4">
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-4 py-2 rounded-lg font-medium">
              {saving ? 'Speichert...' : 'Speichern'}
            </button>
            <Link href="/" className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-medium text-center">
              Abbrechen
            </Link>
          </div>
        </form>

        {/* Sektionen ausserhalb des Formulars */}
        <div className="space-y-4 mt-4">
          {/* Git Clone */}
          {form.repo && (
            <CollapsibleSection title="Git Clone" defaultOpen={false}>
              <GitCloneBox repo={form.repo} />
            </CollapsibleSection>
          )}

          {/* Framework & Datenbank Info */}
          {projectData?.framework && (
            <CollapsibleSection title="Framework & Datenbank" defaultOpen={false}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Framework</span>
                  <span className="px-2 py-0.5 bg-purple-600/30 text-purple-300 rounded text-xs">{projectData.framework}</span>
                </div>
                {projectData.gitMode && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Git-Modus</span>
                    <span className="text-gray-300">{projectData.gitMode === 'theme-only' ? 'Nur Theme' : 'Ganzes System'}</span>
                  </div>
                )}
                {projectData.frameworkInfo?.adminUrl && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Admin-URL</span>
                    <a href={projectData.frameworkInfo.adminUrl} target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300">{projectData.frameworkInfo.adminUrl}</a>
                  </div>
                )}
                {projectData.frameworkInfo?.adminPassword && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Admin-Passwort</span>
                    <code className="bg-gray-900 px-2 py-1 rounded text-green-300">{projectData.frameworkInfo.adminPassword}</code>
                  </div>
                )}
                {projectData.frameworkInfo?.setupUrl && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Setup-URL</span>
                    <a href={projectData.frameworkInfo.setupUrl} target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300">{projectData.frameworkInfo.setupUrl}</a>
                  </div>
                )}
                {projectData.frameworkInfo?.note && (
                  <p className="text-gray-400 mt-2">{projectData.frameworkInfo.note}</p>
                )}
              </div>
              {projectData.frameworkInstalled && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <button type="button" disabled={reinstalling}
                    onClick={async () => {
                      if (!confirm('Framework wird beim nächsten Deploy komplett neu installiert. Das überschreibt alle Dateien im Projektverzeichnis. Fortfahren?')) return
                      setReinstalling(true)
                      try {
                        const res = await fetch(`/api/projects/${id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ frameworkInstalled: false })
                        })
                        const data = await res.json()
                        if (data.success) {
                          setProjectData({ ...projectData, frameworkInstalled: false })
                          alert('Framework-Flag zurückgesetzt. Beim nächsten Deploy wird das Framework neu installiert.')
                        }
                      } catch (e) { alert('Fehler: ' + e.message) }
                      setReinstalling(false)
                    }}
                    className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 px-4 py-2 rounded-lg text-sm font-medium">
                    {reinstalling ? 'Wird zurückgesetzt...' : 'Framework neu installieren'}
                  </button>
                  <p className="text-gray-500 text-xs mt-2">Setzt das Framework-Flag zurück. Beim nächsten Deploy werden alle Install-Steps erneut ausgeführt.</p>
                </div>
              )}
              {projectData.database && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Datenbank</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-gray-400">Name</span><code className="text-gray-300">{projectData.database.name}</code></div>
                    <div className="flex justify-between"><span className="text-gray-400">Benutzer</span><code className="text-gray-300">{projectData.database.user}</code></div>
                    <div className="flex justify-between"><span className="text-gray-400">Passwort</span><code className="text-gray-300">{projectData.database.password}</code></div>
                    <div className="flex justify-between"><span className="text-gray-400">Host</span><code className="text-gray-300">{projectData.database.host}</code></div>
                  </div>
                </div>
              )}
            </CollapsibleSection>
          )}

          {/* AI-Kosten */}
          {projectData?.aiCostTotal > 0 && (
            <CollapsibleSection title="AI-Kosten" defaultOpen={false}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Gesamt</span>
                  <span className="text-green-300 font-mono font-medium">${projectData.aiCostTotal.toFixed(4)}</span>
                </div>
                {(projectData.aiCosts || []).map((c, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-500">
                      {new Date(c.date).toLocaleString('de-DE')} — {c.model} ({c.mode})
                    </span>
                    <span className="text-gray-400 font-mono">${c.costUsd.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Datei-Explorer */}
          {id && (
            <CollapsibleSection title="Datei-Explorer" defaultOpen={false}>
              <FileExplorer projectId={id} />
            </CollapsibleSection>
          )}

          {/* Deploy-Verlauf */}
          <CollapsibleSection title="Deploy-Verlauf" defaultOpen={false}>
            {deployHistory.length === 0 ? (
              <p className="text-gray-500 text-sm">Noch keine Deploys</p>
            ) : (
              <div className="divide-y divide-gray-700">
                {deployHistory.map(d => (
                  <div key={d.id} className="py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${d.success ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span>{d.success ? 'Erfolgreich' : 'Fehlgeschlagen'}</span>
                      {d.failedStep && <span className="text-red-400 text-xs">({d.failedStep})</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        d.trigger === 'webhook' ? 'bg-purple-600/20 text-purple-400' : 'bg-blue-600/20 text-blue-400'
                      }`}>
                        {d.trigger === 'webhook' ? 'Webhook' : 'Manuell'}
                      </span>
                      {d.triggerInfo?.commitMessage && (
                        <span className="text-gray-500 text-xs truncate max-w-[200px] sm:max-w-xs">&quot;{d.triggerInfo.commitMessage.trim()}&quot;</span>
                      )}
                    </div>
                    <div className="text-gray-500 text-xs sm:flex-shrink-0 ml-4 sm:ml-4">
                      {d.aiCostUsd > 0 && <span className="text-green-400 mr-1">${d.aiCostUsd.toFixed(4)}</span>}
                      {d.durationMs && `${(d.durationMs / 1000).toFixed(1)}s — `}
                      {new Date(d.startedAt).toLocaleString('de-DE')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>

          {/* Passwort-Schutz */}
          {id && (
            <CollapsibleSection title="Passwort-Schutz" defaultOpen={false}>
              <PasswordProtection projectId={id} />
            </CollapsibleSection>
          )}
        </div>
    </div>
  )
}
