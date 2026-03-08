// Einstellungen: API Keys, Passwort, 2FA

import { useState, useEffect } from 'react'

import useApiSave from '../hooks/useApiSave'
import ApiKeyField from '../components/settings/ApiKeyField'
import TwoFactorSection from '../components/settings/TwoFactorSection'

const tabs = [
  { id: 'integrations', label: 'Integrationen', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  )},
  { id: 'security', label: 'Sicherheit', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )},
  { id: 'system', label: 'System', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState('integrations')

  // Dashboard Update
  const [updateLoading, setUpdateLoading] = useState(false)
  const [updateMessage, setUpdateMessage] = useState({ type: '', text: '' })
  const [versionInfo, setVersionInfo] = useState(null)
  const [versionLoading, setVersionLoading] = useState(true)
  const [updateSteps, setUpdateSteps] = useState(null)
  const [checkingForUpdates, setCheckingForUpdates] = useState(false)

  // Passwort aendern
  const [newPassword, setNewPassword] = useState('')
  const [currentPasswordForChange, setCurrentPasswordForChange] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' })
  const [passwordLoading, setPasswordLoading] = useState(false)

  // API Keys
  const [giteaToken, setGiteaToken] = useState('')
  const [pageSpeedKey, setPageSpeedKey] = useState('')

  // AI Starter Content
  const [aiProvider, setAiProvider] = useState('anthropic')
  const [aiModel, setAiModel] = useState('')
  const [aiModels, setAiModels] = useState({})
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiAgentMode, setAiAgentMode] = useState(false)

  const giteaSave = useApiSave()
  const pageSpeedSave = useApiSave()
  const aiSave = useApiSave()

  const fetchVersionInfo = async () => {
    setCheckingForUpdates(true)
    try {
      const res = await fetch('/api/dashboard-update')
      const data = await res.json()
      if (!data.error) setVersionInfo(data)
    } catch { /* Server nicht erreichbar */ }
    setCheckingForUpdates(false)
    setVersionLoading(false)
  }

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.giteaToken) setGiteaToken(data.giteaToken)
        if (data.pageSpeedApiKey) setPageSpeedKey(data.pageSpeedApiKey)
        if (data.aiProvider) setAiProvider(data.aiProvider)
        if (data.aiModel) setAiModel(data.aiModel)
        if (data.aiModels) setAiModels(data.aiModels)
        if (data.aiApiKey) setAiApiKey(data.aiApiKey)
        if (data.aiAgentMode) setAiAgentMode(data.aiAgentMode)
      })
    fetchVersionInfo()
  }, [])

  const pollUpdateStatus = () => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/dashboard-update?status=true')
        const data = await res.json()
        if (data.status) {
          setUpdateSteps(data.status.steps)
          if (data.status.status === 'done') {
            clearInterval(interval)
            setUpdateMessage({ type: 'success', text: 'Update erfolgreich — Seite wird neu geladen...' })
            waitForRestart()
          } else if (data.status.status === 'error') {
            clearInterval(interval)
            setUpdateMessage({ type: 'error', text: data.status.error || 'Update fehlgeschlagen' })
            setUpdateLoading(false)
          }
        }
      } catch {
        // Server evtl. gerade im Neustart — weiter pollen
      }
    }, 2000)
    return interval
  }

  const waitForRestart = () => {
    let attempts = 0
    const maxAttempts = 30
    const interval = setInterval(async () => {
      attempts++
      try {
        const res = await fetch('/api/config', { method: 'HEAD' })
        if (res.ok) {
          clearInterval(interval)
          window.location.reload()
        }
      } catch {
        // Server noch nicht bereit
      }
      if (attempts >= maxAttempts) {
        clearInterval(interval)
        setUpdateMessage({ type: 'success', text: 'Update abgeschlossen — bitte Seite manuell neu laden.' })
        setUpdateLoading(false)
      }
    }, 2000)
  }

  const handleDashboardUpdate = async () => {
    setUpdateLoading(true)
    setUpdateMessage({ type: '', text: '' })
    setUpdateSteps(null)
    try {
      const res = await fetch('/api/dashboard-update', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        pollUpdateStatus()
      } else {
        setUpdateMessage({ type: 'error', text: data.error || 'Update fehlgeschlagen' })
        setUpdateLoading(false)
      }
    } catch {
      setUpdateMessage({ type: 'error', text: 'Verbindungsfehler' })
      setUpdateLoading(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordMessage({ type: '', text: '' })

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwörter stimmen nicht überein' })
      return
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Passwort muss mindestens 8 Zeichen haben' })
      return
    }

    setPasswordLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change', currentPassword: currentPasswordForChange, newPassword })
      })
      const data = await res.json()

      if (data.success) {
        setPasswordMessage({ type: 'success', text: 'Passwort erfolgreich geändert!' })
        setNewPassword('')
        setConfirmPassword('')
        setCurrentPasswordForChange('')
      } else {
        setPasswordMessage({ type: 'error', text: data.error || 'Fehler beim Ändern' })
      }
    } catch {
      setPasswordMessage({ type: 'error', text: 'Verbindungsfehler' })
    }
    setPasswordLoading(false)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Einstellungen</h1>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-gray-800/50 p-1 rounded-xl">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-gray-700 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}>
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: Integrationen */}
      {activeTab === 'integrations' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ApiKeyField
              label="Gitea API Token"
              description="Wird benötigt um Repositories beim Erstellen eines neuen Projekts anzuzeigen."
              value={giteaToken} onChange={setGiteaToken}
              placeholder="Gitea API Token eingeben"
              onSave={() => giteaSave.save('/api/config', { giteaToken }, 'Token gespeichert!')}
              saving={giteaSave.saving} message={giteaSave.message}
              buttonLabel="Token speichern"
            />
            <ApiKeyField
              label="PageSpeed API Key"
              description="Optional — verbessert Rate-Limits der Google PageSpeed Insights API."
              value={pageSpeedKey} onChange={setPageSpeedKey}
              placeholder="PageSpeed API Key eingeben"
              onSave={() => pageSpeedSave.save('/api/config', { pageSpeedApiKey: pageSpeedKey }, 'API Key gespeichert!')}
              saving={pageSpeedSave.saving} message={pageSpeedSave.message}
              buttonLabel="Key speichern"
            />
          </div>

          {/* AI Starter Content */}
          <div className="bento-card p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-1">AI Starter Content</h2>
            <p className="text-gray-400 text-sm mb-5">
              Generiert Starter-Dateien beim Erstellen neuer Projekte basierend auf einer Beschreibung.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Provider</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setAiProvider('anthropic'); setAiModel('') }}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    aiProvider === 'anthropic' ? 'border-blue-500 bg-blue-600/20' : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                  }`}>
                  <span className="font-medium text-sm">Anthropic Claude</span>
                </button>
                <button type="button" onClick={() => { setAiProvider('openai'); setAiModel('') }}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    aiProvider === 'openai' ? 'border-blue-500 bg-blue-600/20' : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                  }`}>
                  <span className="font-medium text-sm">OpenAI</span>
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Modell</label>
              <div className="grid grid-cols-2 gap-2">
                {(aiModels[aiProvider] || []).map(m => (
                  <button key={m.id} type="button" onClick={() => setAiModel(m.id)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      (aiModel || (aiModels[aiProvider] || [])[0]?.id) === m.id ? 'border-blue-500 bg-blue-600/20' : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                    }`}>
                    <span className="font-medium text-sm">{m.label}</span>
                    <p className="text-gray-400 text-xs mt-0.5">{m.cost} pro Aufruf</p>
                  </button>
                ))}
              </div>
            </div>

            {aiProvider === 'anthropic' && (
              <div className="mb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" checked={aiAgentMode} onChange={e => setAiAgentMode(e.target.checked)} className="sr-only peer" />
                    <div className="w-10 h-5 bg-gray-600 rounded-full peer-checked:bg-blue-500 transition-colors" />
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-200">Agent Mode</span>
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-yellow-600/30 text-yellow-400">experimentell</span>
                  </div>
                </label>
                <p className="text-gray-500 text-xs mt-1.5 ml-[52px]">
                  AI arbeitet autonom — liest Code, generiert, baut und fixt Fehler selbst. Braucht Claude Code CLI auf dem Server.
                </p>
              </div>
            )}

            <ApiKeyField
              label="" description=""
              value={aiApiKey} onChange={setAiApiKey}
              placeholder={aiProvider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
              onSave={() => aiSave.save('/api/config', { aiProvider, aiApiKey, aiModel, aiAgentMode }, 'AI Konfiguration gespeichert!')}
              saving={aiSave.saving} message={aiSave.message}
              buttonLabel="Konfiguration speichern"
            />
          </div>
        </div>
      )}

      {/* Tab: Sicherheit */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          {/* Passwort aendern */}
          <div className="bento-card p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Passwort ändern</h2>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Aktuelles Passwort</label>
                <input type="password" value={currentPasswordForChange}
                  onChange={(e) => setCurrentPasswordForChange(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Aktuelles Passwort" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Neues Passwort</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mindestens 8 Zeichen" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Passwort bestätigen</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Neues Passwort wiederholen" />
                </div>
              </div>
              {passwordMessage.text && (
                <p className={passwordMessage.type === 'error' ? 'text-red-400' : 'text-green-400'}>{passwordMessage.text}</p>
              )}
              <button type="submit" disabled={passwordLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-6 py-3 rounded-lg font-medium">
                {passwordLoading ? 'Speichert...' : 'Passwort ändern'}
              </button>
            </form>
          </div>

          {/* 2FA */}
          <TwoFactorSection />
        </div>
      )}

      {/* Tab: System */}
      {activeTab === 'system' && (
        <div className="space-y-4">
          {/* Dashboard Update */}
          <div className="bento-card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold">Dashboard Update</h2>
              {versionInfo?.current && (
                <span className="text-xs text-gray-500 font-mono">{versionInfo.current.shortHash}</span>
              )}
            </div>

            {/* Versions-Info */}
            {versionLoading ? (
              <p className="text-gray-500 text-sm mb-4">Prüfe auf Updates...</p>
            ) : versionInfo ? (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  {versionInfo.updatesAvailable > 0 ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600/30 text-blue-400">
                      {versionInfo.updatesAvailable} {versionInfo.updatesAvailable === 1 ? 'Update' : 'Updates'} verfügbar
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-600/30 text-green-400">
                      Aktuell
                    </span>
                  )}
                </div>
                {versionInfo.current && (
                  <p className="text-gray-500 text-xs">
                    Aktuelle Version: {versionInfo.current.message} ({new Date(versionInfo.current.date).toLocaleDateString('de-DE')})
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm mb-4">Versions-Info nicht verfügbar</p>
            )}

            {/* Changelog */}
            {versionInfo?.changelog?.length > 0 && !updateLoading && (
              <div className="mb-4 border border-gray-700 rounded-lg overflow-hidden">
                <div className="bg-gray-800/50 px-3 py-2 text-xs font-medium text-gray-400">Änderungen</div>
                <div className="max-h-40 overflow-y-auto">
                  {versionInfo.changelog.map((commit, i) => (
                    <div key={commit.hash} className={`px-3 py-2 text-sm flex items-start gap-2 ${i > 0 ? 'border-t border-gray-700/50' : ''}`}>
                      <span className="text-gray-500 font-mono text-xs mt-0.5 shrink-0">{commit.hash}</span>
                      <span className="text-gray-300">{commit.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fortschritts-Anzeige */}
            {updateSteps && (
              <div className="mb-4 space-y-2">
                {updateSteps.map((step) => (
                  <div key={step.name} className="flex items-center gap-3">
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {step.status === 'done' && (
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {step.status === 'running' && (
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      )}
                      {step.status === 'error' && (
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      {step.status === 'pending' && (
                        <div className="w-3 h-3 rounded-full bg-gray-600" />
                      )}
                    </div>
                    <span className={`text-sm ${
                      step.status === 'running' ? 'text-blue-400' :
                      step.status === 'done' ? 'text-gray-400' :
                      step.status === 'error' ? 'text-red-400' : 'text-gray-600'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Fehler-Output */}
            {updateSteps?.find(s => s.status === 'error')?.output && (
              <div className="mb-4 bg-red-900/20 border border-red-800/50 rounded-lg p-3">
                <pre className="text-xs text-red-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {updateSteps.find(s => s.status === 'error').output}
                </pre>
              </div>
            )}

            {updateMessage.text && (
              <p className={`mb-4 text-sm ${updateMessage.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{updateMessage.text}</p>
            )}

            <div className="flex items-center gap-3">
              <button onClick={handleDashboardUpdate} disabled={updateLoading || (versionInfo && versionInfo.updatesAvailable === 0)}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 px-6 py-3 rounded-lg font-medium transition-colors">
                {updateLoading ? 'Update läuft...' : versionInfo?.updatesAvailable > 0 ? 'Dashboard aktualisieren' : 'Keine Updates verfügbar'}
              </button>
              {!updateLoading && (
                <button onClick={fetchVersionInfo} disabled={checkingForUpdates}
                  className="text-gray-400 hover:text-white text-sm transition-colors">
                  {checkingForUpdates ? 'Prüfe...' : 'Erneut prüfen'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
