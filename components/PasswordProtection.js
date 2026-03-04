// Passwort-Schutz Verwaltung fuer Projekte

import { useState, useEffect } from 'react'

export default function PasswordProtection({ projectId }) {
  const [passwordEnabled, setPasswordEnabled] = useState(false)
  const [projectPassword, setProjectPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    if (!projectId) return
    fetch(`/api/projects/${projectId}/password`)
      .then(res => res.json())
      .then(data => {
        setPasswordEnabled(data.passwordEnabled || false)
        setProjectPassword(data.password || '')
      })
      .catch(() => {})
  }, [projectId])

  const handleToggle = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })
    const newEnabled = !passwordEnabled
    if (newEnabled && !projectPassword) {
      setMessage({ type: 'error', text: 'Bitte zuerst ein Passwort eingeben' })
      setSaving(false)
      return
    }
    try {
      const res = await fetch(`/api/projects/${projectId}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled, password: projectPassword })
      })
      const data = await res.json()
      if (data.success) {
        setPasswordEnabled(newEnabled)
        setMessage({ type: 'success', text: newEnabled ? 'Passwort-Schutz aktiviert' : 'Passwort-Schutz deaktiviert' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Fehler' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Verbindungsfehler' })
    }
    setSaving(false)
  }

  const handleSave = async () => {
    if (!projectPassword || projectPassword.length < 4) {
      setMessage({ type: 'error', text: 'Passwort muss mindestens 4 Zeichen haben' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const res = await fetch(`/api/projects/${projectId}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true, password: projectPassword })
      })
      const data = await res.json()
      if (data.success) {
        setPasswordEnabled(true)
        setMessage({ type: 'success', text: 'Passwort gespeichert und aktiviert' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Fehler' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Verbindungsfehler' })
    }
    setSaving(false)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
      <div className="flex justify-between items-center mb-4 gap-2">
        <h2 className="text-lg sm:text-xl font-semibold">Passwort-Schutz</h2>
        <span className={`px-3 py-1 rounded text-sm flex-shrink-0 ${passwordEnabled ? 'bg-green-600' : 'bg-gray-600'}`}>
          {passwordEnabled ? 'Aktiv' : 'Inaktiv'}
        </span>
      </div>
      <p className="text-gray-400 text-sm mb-4">
        Wenn aktiviert, müssen Besucher ein Passwort eingeben bevor sie die Seite sehen können.
        Benutzername ist immer: <code className="bg-gray-700 px-2 py-1 rounded">user</code>
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Passwort</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input type={showPassword ? 'text' : 'password'} value={projectPassword}
              onChange={e => setProjectPassword(e.target.value)} placeholder="Passwort für Besucher"
              className="flex-1 bg-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded sm:flex-shrink-0">
              {showPassword ? 'Verbergen' : 'Anzeigen'}
            </button>
          </div>
        </div>
        {message.text && (
          <p className={message.type === 'error' ? 'text-red-400' : 'text-green-400'}>{message.text}</p>
        )}
        <div className="flex flex-wrap gap-3">
          {!passwordEnabled ? (
            <button type="button" onClick={handleSave} disabled={saving || !projectPassword}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded-lg font-medium">
              {saving ? 'Aktiviert...' : 'Aktivieren'}
            </button>
          ) : (
            <>
              <button type="button" onClick={handleSave} disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded-lg font-medium">
                {saving ? 'Speichert...' : 'Passwort ändern'}
              </button>
              <button type="button" onClick={handleToggle} disabled={saving}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 px-4 py-2 rounded-lg font-medium">
                Deaktivieren
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
