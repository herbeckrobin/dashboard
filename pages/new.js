import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import DeployLog from '../components/DeployLog'
import GitCloneBox from '../components/GitCloneBox'
import FileTree from '../components/FileTree'

export default function NewProject() {
  const router = useRouter()

  // Repos
  const [repos, setRepos] = useState([])
  const [reposLoading, setReposLoading] = useState(true)
  const [reposError, setReposError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedRepo, setSelectedRepo] = useState(null)

  // Neues Repo erstellen
  const [showCreateRepo, setShowCreateRepo] = useState(false)
  const [newRepo, setNewRepo] = useState({ name: '', description: '', isPrivate: true, autoInit: true })
  const [createError, setCreateError] = useState('')

  // Gruppen
  const [groups, setGroups] = useState([])
  const [groupId, setGroupId] = useState(router.query.groupId || '')
  const [limitWarning, setLimitWarning] = useState('')

  // Projekt-Formular
  const [form, setForm] = useState({ name: '', domain: '', type: 'nextjs', framework: null, gitMode: 'theme-only', databaseMode: 'auto', database: { name: '', user: '', password: '', host: 'localhost' }, aiDescription: '' })
  const [aiConfigured, setAiConfigured] = useState(false)
  const [aiCostHint, setAiCostHint] = useState('')
  const [deploying, setDeploying] = useState(false)
  const [error, setError] = useState('')

  // Deploy-Ergebnis
  const [createdProject, setCreatedProject] = useState(null)
  const [fileChanges, setFileChanges] = useState([])
  const [deployDone, setDeployDone] = useState(false)

  // Callback fuer DeployLog — aktualisiert fileChanges aus dem Log
  const handleLogUpdate = useCallback((log) => {
    if (log.fileChanges && log.fileChanges.length > 0) {
      setFileChanges(log.fileChanges)
    }
    if (log.done) setDeployDone(true)
  }, [])

  useEffect(() => {
    loadRepos()
    fetch('/api/groups').then(r => r.json()).then(d => setGroups(d.groups || [])).catch(() => {})
    fetch('/api/config').then(r => r.json()).then(d => {
      if (d.aiApiKey) setAiConfigured(true)
      const models = d.aiModels?.[d.aiProvider || 'anthropic'] || []
      const activeModel = models.find(m => m.id === d.aiModel) || models[0]
      if (activeModel) setAiCostHint(`${activeModel.label} ${activeModel.cost}`)
    }).catch(() => {})
  }, [])

  // groupId aus URL-Query uebernehmen
  useEffect(() => {
    if (router.query.groupId && !groupId) setGroupId(router.query.groupId)
  }, [router.query.groupId])

  const loadRepos = () => {
    setReposLoading(true)
    setReposError('')
    fetch('/api/repos')
      .then(res => res.json())
      .then(data => {
        if (data.error) setReposError(data.error)
        else setRepos(data.repos || [])
        setReposLoading(false)
      })
      .catch(() => {
        setReposError('Repos konnten nicht geladen werden')
        setReposLoading(false)
      })
  }

  const handleSelectRepo = (repo) => {
    setSelectedRepo(repo)
    setForm({ ...form, name: repo.name, domain: `${repo.name}.rhdemo.de` })
    setShowCreateRepo(false)
  }

  const handleDeselectRepo = () => {
    setSelectedRepo(null)
    setForm({ name: '', domain: '', type: 'nextjs', framework: null, gitMode: 'theme-only', databaseMode: 'auto', database: { name: '', user: '', password: '', host: 'localhost' }, aiDescription: '' })
  }

  const handleCreateRepo = (e) => {
    e.preventDefault()
    setCreateError('')
    // Optimistic: sofort Platzhalter-Repo einfuegen und auswaehlen
    const slug = newRepo.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    const optimisticRepo = { name: slug, full_name: `deploy/${slug}`, html_url: `http://localhost:3000/deploy/${slug}`, description: newRepo.description }
    setRepos(prev => [...prev, optimisticRepo].sort((a, b) => a.full_name.localeCompare(b.full_name)))
    handleSelectRepo(optimisticRepo)
    const repoData = { ...newRepo }
    setNewRepo({ name: '', description: '', isPrivate: true, autoInit: true })
    // API im Hintergrund
    fetch('/api/repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(repoData)
    })
      .then(r => r.json().then(data => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          alert('Fehler beim Repo-Erstellen: ' + (data.error || 'Unbekannter Fehler'))
          setRepos(prev => prev.filter(r => r.full_name !== optimisticRepo.full_name))
          handleDeselectRepo()
          return
        }
        // Ersetze Platzhalter mit echtem Repo
        setRepos(prev => prev.map(r => r.full_name === optimisticRepo.full_name ? data.repo : r))
        setSelectedRepo(data.repo)
      })
      .catch(() => {
        alert('Fehler beim Repo-Erstellen: Netzwerkfehler')
        setRepos(prev => prev.filter(r => r.full_name !== optimisticRepo.full_name))
        handleDeselectRepo()
      })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedRepo) return
    setDeploying(true)
    setError('')

    const body = { name: form.name, domain: form.domain, repo: selectedRepo.full_name }
    if (groupId) body.groupId = groupId
    if (form.framework) {
      body.framework = form.framework
      if (form.framework === 'wordpress') body.gitMode = form.gitMode
      if (['wordpress', 'redaxo', 'laravel', 'typo3', 'contao'].includes(form.framework)) {
        body.databaseMode = form.databaseMode
        if (form.databaseMode === 'manual') body.database = form.database
      }
    } else {
      body.type = form.type
    }
    if (form.aiDescription.trim()) body.aiDescription = form.aiDescription.trim()

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) {
        // Limit erreicht: Admin-Override anbieten
        if (data.limitReached) {
          if (confirm(`${data.error}\n\nTrotzdem erstellen (Admin-Override)?`)) {
            body.adminOverride = true
            const retryRes = await fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
            })
            const retryData = await retryRes.json()
            if (!retryRes.ok) throw new Error(retryData.error || 'Fehler beim Erstellen')
            setCreatedProject(retryData.project)
            return
          }
          setDeploying(false)
          return
        }
        throw new Error(data.error || 'Fehler beim Erstellen')
      }
      setCreatedProject(data.project)
    } catch (err) {
      setError(err.message)
      setDeploying(false)
    }
  }

  const FRAMEWORKS = [
    { value: null, label: 'Kein Framework', desc: 'Eigener Code', color: 'gray' },
    { value: 'wordpress', label: 'WordPress', desc: 'CMS mit PHP', color: 'blue' },
    { value: 'redaxo', label: 'Redaxo', desc: 'CMS mit PHP', color: 'red' },
    { value: 'typo3', label: 'TYPO3', desc: 'Enterprise CMS', color: 'orange' },
    { value: 'contao', label: 'Contao', desc: 'CMS mit PHP', color: 'yellow' },
    { value: 'laravel', label: 'Laravel', desc: 'PHP Framework', color: 'orange' },
    { value: 'nextjs-starter', label: 'Next.js Starter', desc: 'React SSR', color: 'purple' },
    { value: 'express-starter', label: 'Express Starter', desc: 'Node.js API', color: 'green' },
  ]

  const frameworkLabels = {
    wordpress: 'WordPress installieren & deployen',
    redaxo: 'Redaxo installieren & deployen',
    typo3: 'TYPO3 installieren & deployen',
    contao: 'Contao installieren & deployen',
    laravel: 'Laravel installieren & deployen',
    'nextjs-starter': 'Next.js Starter erstellen & deployen',
    'express-starter': 'Express Starter erstellen & deployen',
  }

  const buttonLabel = form.framework
    ? frameworkLabels[form.framework]
    : (form.type === 'nextjs' || form.type === 'node' ? 'Projekt erstellen & deployen' : 'Projekt erstellen & einrichten')
  const buttonLabelActive = 'Wird installiert...'

  // Repos filtern
  const filteredRepos = repos.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  )
  const availableRepos = filteredRepos.filter(r => !r.used)
  const usedRepos = filteredRepos.filter(r => r.used)
  const repoNameSlug = newRepo.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

  // Framework-Info nachladen nach Deploy
  const [frameworkInfo, setFrameworkInfo] = useState(null)
  useEffect(() => {
    if (!createdProject) return
    const poll = setInterval(() => {
      fetch(`/api/projects/${createdProject.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.project?.frameworkInfo) {
            setFrameworkInfo(data.project.frameworkInfo)
            clearInterval(poll)
          }
        })
        .catch(() => {})
    }, 3000)
    return () => clearInterval(poll)
  }, [createdProject])

  // ===== STEP 3: Deploy-Log Ansicht =====
  if (createdProject) {
    return (
      <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{createdProject.name}</h1>
          <p className="text-gray-400 text-sm sm:text-base mb-6">
            {createdProject.domain} — {createdProject.type}
            {createdProject.framework && <span className="ml-2 px-2 py-0.5 bg-purple-600/30 text-purple-300 rounded text-xs">{createdProject.framework}</span>}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ minHeight: '60vh' }}>
            {/* Links: Deploy-Log */}
            <div className="lg:col-span-3 flex flex-col">
              <DeployLog
                projectId={createdProject.id}
                projectDomain={createdProject.domain}
                showDashboardLink
                onLogUpdate={handleLogUpdate}
              />

              {/* Framework-Credentials */}
              {frameworkInfo && (
                <div className="bg-gray-800 rounded-lg p-4 sm:p-6 mt-4 border border-green-600/30">
                  <h2 className="text-lg font-semibold mb-3 text-green-300">Zugangsdaten</h2>
                  <div className="space-y-2 text-sm">
                    {frameworkInfo.adminUrl && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Admin-URL</span>
                        <a href={frameworkInfo.adminUrl} target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300">{frameworkInfo.adminUrl}</a>
                      </div>
                    )}
                    {frameworkInfo.adminPassword && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Admin-Passwort</span>
                        <code className="bg-gray-900 px-2 py-1 rounded text-green-300">{frameworkInfo.adminPassword}</code>
                      </div>
                    )}
                    {frameworkInfo.setupUrl && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Setup-URL</span>
                        <a href={frameworkInfo.setupUrl} target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300">{frameworkInfo.setupUrl}</a>
                      </div>
                    )}
                    {frameworkInfo.note && (
                      <p className="text-gray-400 mt-2">{frameworkInfo.note}</p>
                    )}
                  </div>
                  {createdProject.database && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <h3 className="text-sm font-medium text-gray-300 mb-2">Datenbank</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-gray-400">Name</span><code className="text-gray-300">{createdProject.database.name}</code></div>
                        <div className="flex justify-between"><span className="text-gray-400">Benutzer</span><code className="text-gray-300">{createdProject.database.user}</code></div>
                        <div className="flex justify-between"><span className="text-gray-400">Passwort</span><code className="text-gray-300">{createdProject.database.password}</code></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {createdProject.repo && (
                <div className="mt-4"><GitCloneBox repo={createdProject.repo} /></div>
              )}
            </div>

            {/* Rechts: File-Tree */}
            <div className="lg:col-span-2 hidden lg:block">
              <FileTree fileChanges={fileChanges} isDeploying={!deployDone} />
            </div>
          </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 md:mb-8">Neues Projekt</h1>

        {/* ===== STEP 1: Repo auswaehlen ===== */}
        {!selectedRepo ? (
          <div>
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setShowCreateRepo(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  !showCreateRepo ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                Bestehendes Repo
              </button>
              <button
                onClick={() => setShowCreateRepo(true)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  showCreateRepo ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                + Neues Repo erstellen
              </button>
            </div>

            {showCreateRepo && (
              <div className="bg-gray-800 rounded-lg p-4 sm:p-6 mb-6">
                <h2 className="text-lg sm:text-xl font-semibold mb-4">Neues Gitea Repository</h2>
                <form onSubmit={handleCreateRepo} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Repository Name</label>
                    <input
                      type="text"
                      value={newRepo.name}
                      onChange={e => setNewRepo({...newRepo, name: e.target.value})}
                      placeholder="mein-projekt"
                      required
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                    />
                    {newRepo.name && (
                      <p className="text-gray-500 text-sm mt-1">
                        Wird erstellt als: <span className="text-gray-300 font-mono">{repoNameSlug || '...'}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Beschreibung <span className="text-gray-500">(optional)</span></label>
                    <input
                      type="text"
                      value={newRepo.description}
                      onChange={e => setNewRepo({...newRepo, description: e.target.value})}
                      placeholder="Kurze Beschreibung des Projekts"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-wrap gap-4 sm:gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newRepo.isPrivate} onChange={e => setNewRepo({...newRepo, isPrivate: e.target.checked})} className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500" />
                      <span className="text-sm text-gray-300">Privat</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newRepo.autoInit} onChange={e => setNewRepo({...newRepo, autoInit: e.target.checked})} className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500" />
                      <span className="text-sm text-gray-300">Mit README initialisieren</span>
                    </label>
                  </div>
                  {createError && (
                    <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 text-red-300 text-sm">{createError}</div>
                  )}
                  <button type="submit" disabled={!newRepo.name.trim()} className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 rounded-lg font-medium">
                    Repository auf Gitea erstellen
                  </button>
                </form>
              </div>
            )}

            {!showCreateRepo && (
              <div>
                {reposLoading ? (
                  <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">Repos werden geladen...</div>
                ) : reposError ? (
                  <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-4 text-yellow-300">
                    <p className="mb-2">{reposError}</p>
                    <Link href="/settings" className="text-blue-400 hover:text-blue-300 underline text-sm">→ Einstellungen öffnen</Link>
                  </div>
                ) : (
                  <div>
                    {repos.length > 5 && (
                      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Repos durchsuchen..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:border-blue-500" />
                    )}
                    {availableRepos.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wide">Verfügbar ({availableRepos.length})</h3>
                        <div className="grid gap-2">
                          {availableRepos.map(repo => (
                            <button key={repo.full_name} onClick={() => handleSelectRepo(repo)}
                              className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500 rounded-lg p-4 text-left transition-colors">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                  <span className="font-medium break-all">{repo.full_name}</span>
                                  {repo.private && <span className="text-xs bg-yellow-600/30 text-yellow-400 px-2 py-0.5 rounded">privat</span>}
                                  {repo.empty && <span className="text-xs bg-gray-600 text-gray-300 px-2 py-0.5 rounded">leer</span>}
                                </div>
                                <span className="text-gray-500 text-sm flex-shrink-0 hidden sm:inline">auswählen →</span>
                              </div>
                              {repo.description && <p className="text-gray-400 text-sm mt-1">{repo.description}</p>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {usedRepos.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wide">Bereits verwendet ({usedRepos.length})</h3>
                        <div className="grid gap-2">
                          {usedRepos.map(repo => (
                            <div key={repo.full_name} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 opacity-60">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{repo.full_name}</span>
                                  {repo.private && <span className="text-xs bg-yellow-600/30 text-yellow-400 px-2 py-0.5 rounded">privat</span>}
                                </div>
                                <span className="text-xs bg-blue-600/30 text-blue-400 px-2 py-0.5 rounded">Projekt: {repo.usedBy}</span>
                              </div>
                              {repo.description && <p className="text-gray-500 text-sm mt-1">{repo.description}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {filteredRepos.length === 0 && (
                      <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
                        {search ? 'Keine Repos gefunden' : 'Keine Repos vorhanden'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ===== STEP 2: Projekt konfigurieren ===== */
          <div>
            <div className="bg-gray-800 border border-blue-500/50 rounded-lg p-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Repository</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base sm:text-lg font-semibold break-all">{selectedRepo.full_name}</span>
                    {selectedRepo.private && <span className="text-xs bg-yellow-600/30 text-yellow-400 px-2 py-0.5 rounded">privat</span>}
                    {selectedRepo.empty && <span className="text-xs bg-gray-600 text-gray-300 px-2 py-0.5 rounded">leer</span>}
                  </div>
                  {selectedRepo.description && <p className="text-gray-400 text-sm mt-1">{selectedRepo.description}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <a href={selectedRepo.html_url} target="_blank" rel="noopener" className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded text-sm">Gitea</a>
                  <button onClick={handleDeselectRepo} className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded text-sm">Ändern</button>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-4 sm:p-6 space-y-5">
              <h2 className="text-lg sm:text-xl font-semibold mb-2">Projekt konfigurieren</h2>
              <div>
                <label className="block text-sm font-medium mb-2">Projektname</label>
                <input type="text" value={form.name}
                  onChange={e => {
                    const name = e.target.value
                    setForm({ ...form, name, domain: name ? `${name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.rhdemo.de` : '' })
                  }}
                  placeholder="mein-projekt" required
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Domain</label>
                <input type="text" value={form.domain} onChange={e => setForm({...form, domain: e.target.value})}
                  placeholder="mein-projekt.rhdemo.de" required
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500" />
                <p className="text-gray-500 text-sm mt-1">Subdomain oder eigene Domain</p>
              </div>

              {/* Gruppen-Zuordnung */}
              {groups.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Kunden-Gruppe <span className="text-gray-500">(optional)</span>
                  </label>
                  <select value={groupId} onChange={e => setGroupId(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500">
                    <option value="">Keine Gruppe</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.package})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Framework-Auswahl */}
              <div>
                <label className="block text-sm font-medium mb-2">Framework / CMS</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FRAMEWORKS.map(fw => (
                    <button key={fw.value || 'none'} type="button"
                      onClick={() => setForm({...form, framework: fw.value})}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        form.framework === fw.value ? 'border-blue-500 bg-blue-600/20' : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}>
                      <span className="font-medium text-sm">{fw.label}</span>
                      <p className="text-gray-400 text-xs mt-0.5">{fw.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Projekttyp (nur ohne Framework) */}
              {!form.framework && (
                <div>
                  <label className="block text-sm font-medium mb-2">Projekttyp</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { value: 'nextjs', label: 'Next.js', desc: 'React SSR' },
                      { value: 'node', label: 'Node.js', desc: 'Express etc.' },
                      { value: 'php', label: 'PHP', desc: 'Eigener Code' },
                      { value: 'static', label: 'Static', desc: 'HTML/CSS/JS' },
                    ].map(t => (
                      <button key={t.value} type="button" onClick={() => setForm({...form, type: t.value})}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          form.type === t.value ? 'border-blue-500 bg-blue-600/20' : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                        }`}>
                        <span className="font-medium text-sm">{t.label}</span>
                        <p className="text-gray-400 text-xs mt-0.5">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Starter Content (nur bei Framework + konfiguriertem AI Key) */}
              {form.framework && aiConfigured && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    AI Starter Content <span className="text-gray-500">(optional)</span>
                  </label>
                  <textarea
                    value={form.aiDescription}
                    onChange={e => setForm({...form, aiDescription: e.target.value})}
                    placeholder={
                      form.framework === 'wordpress' ? 'z.B. "Ein modernes Portfolio-Theme mit dunklem Design, Hero-Section, Galerie-Grid und Kontaktformular"' :
                      form.framework === 'laravel' ? 'z.B. "Eine Todo-App mit Benutzer-Authentifizierung, CRUD-Operationen und REST-API"' :
                      form.framework === 'redaxo' ? 'z.B. "Website fuer einen Fotografen mit Galerie-Modul und Kontaktseite"' :
                      form.framework === 'typo3' ? 'z.B. "Corporate Website mit News-Bereich und Kontaktformular"' :
                      form.framework === 'contao' ? 'z.B. "Vereins-Website mit Veranstaltungen und Mitglieder-Bereich"' :
                      form.framework === 'nextjs-starter' ? 'z.B. "Ein Blog mit Markdown-Support, Dark Mode und Kategorien"' :
                      'Beschreibe dein Projekt...'
                    }
                    rows={3}
                    maxLength={1000}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <p className="text-gray-500 text-sm mt-1">
                    AI generiert passende Starter-Dateien nach der Installation.{aiCostHint && <span className="ml-1 text-gray-400">({aiCostHint})</span>}
                    {form.aiDescription.length > 0 && (
                      <span className="ml-2 text-gray-400">{form.aiDescription.length}/1000</span>
                    )}
                  </p>
                </div>
              )}

              {/* Git-Modus (nur bei WordPress) */}
              {form.framework === 'wordpress' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Git-Modus</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button type="button" onClick={() => setForm({...form, gitMode: 'theme-only'})}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        form.gitMode === 'theme-only' ? 'border-blue-500 bg-blue-600/20' : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}>
                      <span className="font-medium text-sm">Nur Theme</span>
                      <p className="text-gray-400 text-xs mt-0.5">WP auf Server, nur Theme im Repo</p>
                    </button>
                    <button type="button" onClick={() => setForm({...form, gitMode: 'full'})}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        form.gitMode === 'full' ? 'border-blue-500 bg-blue-600/20' : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}>
                      <span className="font-medium text-sm">Ganzes System</span>
                      <p className="text-gray-400 text-xs mt-0.5">Komplettes WP ins Repo pushen</p>
                    </button>
                  </div>
                </div>
              )}

              {/* Datenbank-Konfiguration (nur bei WP/Redaxo/Laravel) */}
              {form.framework && ['wordpress', 'redaxo', 'laravel', 'typo3', 'contao'].includes(form.framework) && (
                <div>
                  <label className="block text-sm font-medium mb-2">Datenbank</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    <button type="button" onClick={() => setForm({...form, databaseMode: 'auto'})}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        form.databaseMode === 'auto' ? 'border-blue-500 bg-blue-600/20' : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}>
                      <span className="font-medium text-sm">Automatisch</span>
                      <p className="text-gray-400 text-xs mt-0.5">DB + User werden generiert</p>
                    </button>
                    <button type="button" onClick={() => setForm({...form, databaseMode: 'manual'})}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        form.databaseMode === 'manual' ? 'border-blue-500 bg-blue-600/20' : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                      }`}>
                      <span className="font-medium text-sm">Manuell</span>
                      <p className="text-gray-400 text-xs mt-0.5">Eigene Zugangsdaten eingeben</p>
                    </button>
                  </div>
                  {form.databaseMode === 'manual' && (
                    <div className="space-y-3 bg-gray-900 rounded-lg p-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Datenbankname</label>
                        <input type="text" value={form.database.name}
                          onChange={e => setForm({...form, database: {...form.database, name: e.target.value}})}
                          placeholder="db_name" required
                          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Benutzer</label>
                        <input type="text" value={form.database.user}
                          onChange={e => setForm({...form, database: {...form.database, user: e.target.value}})}
                          placeholder="db_user" required
                          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Passwort</label>
                        <input type="text" value={form.database.password}
                          onChange={e => setForm({...form, database: {...form.database, password: e.target.value}})}
                          placeholder="db_password" required
                          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button type="submit" disabled={deploying}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed py-3 rounded-lg font-medium text-lg">
                {deploying ? buttonLabelActive : buttonLabel}
              </button>
            </form>
          </div>
        )}
    </div>
  )
}
