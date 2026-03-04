// Einstellungen: API Keys, Passwort, 2FA

import { useState, useEffect } from 'react'

import useApiSave from '../hooks/useApiSave'
import ApiKeyField from '../components/settings/ApiKeyField'
import TwoFactorSection from '../components/settings/TwoFactorSection'

export default function Settings() {
  // Dashboard Update
  const [updateLoading, setUpdateLoading] = useState(false)
  const [updateMessage, setUpdateMessage] = useState({ type: '', text: '' })

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
  }, [])

  const handleDashboardUpdate = async () => {
    setUpdateLoading(true)
    setUpdateMessage({ type: '', text: '' })
    try {
      const res = await fetch('/api/dashboard-update', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setUpdateMessage({ type: 'success', text: 'Update gestartet — Seite wird in wenigen Sekunden neu geladen...' })
        // Nach Neustart der App automatisch neu laden
        setTimeout(() => window.location.reload(), 15000)
      } else {
        setUpdateMessage({ type: 'error', text: data.error || 'Update fehlgeschlagen' })
      }
    } catch {
      setUpdateMessage({ type: 'error', text: 'Verbindungsfehler' })
    }
    setUpdateLoading(false)
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Gitea API Token */}
        <ApiKeyField
          label="Gitea API Token"
          description="Wird benötigt um Repositories beim Erstellen eines neuen Projekts anzuzeigen."
          value={giteaToken} onChange={setGiteaToken}
          placeholder="Gitea API Token eingeben"
          onSave={() => giteaSave.save('/api/config', { giteaToken }, 'Token gespeichert!')}
          saving={giteaSave.saving} message={giteaSave.message}
          buttonLabel="Token speichern"
        />

        {/* PageSpeed API Key */}
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
        <div className="bento-card p-4 sm:p-6 mb-4">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">AI Starter Content</h2>
          <p className="text-gray-400 text-sm mb-4">
            Optional — generiert Starter-Dateien beim Erstellen neuer Projekte basierend auf einer Beschreibung.
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

        {/* Passwort aendern */}
        <div className="bento-card p-4 sm:p-6 mb-4">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Passwort ändern</h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Aktuelles Passwort</label>
              <input type="password" value={currentPasswordForChange}
                onChange={(e) => setCurrentPasswordForChange(e.target.value)}
                className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Aktuelles Passwort" />
            </div>
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
            {passwordMessage.text && (
              <p className={passwordMessage.type === 'error' ? 'text-red-400' : 'text-green-400'}>{passwordMessage.text}</p>
            )}
            <button type="submit" disabled={passwordLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-6 py-3 rounded-lg font-medium">
              {passwordLoading ? 'Speichert...' : 'Passwort ändern'}
            </button>
          </form>
        </div>

        {/* Dashboard Update */}
        <div className="bento-card p-4 sm:p-6 mb-4">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Dashboard Update</h2>
          <p className="text-gray-400 text-sm mb-4">
            Aktualisiert das Dashboard vom GitHub-Repository (git pull, build, Service-Neustart).
          </p>
          {updateMessage.text && (
            <p className={`mb-4 ${updateMessage.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{updateMessage.text}</p>
          )}
          <button onClick={handleDashboardUpdate} disabled={updateLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-6 py-3 rounded-lg font-medium">
            {updateLoading ? 'Update läuft...' : 'Dashboard aktualisieren'}
          </button>
        </div>

        {/* 2FA */}
        <TwoFactorSection />
    </div>
  )
}
