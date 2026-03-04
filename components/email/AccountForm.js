// Postfach erstellen/bearbeiten Modal

import { useState } from 'react'

function generatePassword() {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%'
  let pw = ''
  for (let i = 0; i < 16; i++) pw += chars[Math.floor(Math.random() * chars.length)]
  return pw
}

export default function AccountForm({ domain, account, onSave, onCancel }) {
  const isEdit = !!account
  const [form, setForm] = useState({
    local: account?.local || '',
    password: '',
    displayName: account?.displayName || '',
    quotaMb: account?.quotaMb || 1024,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!isEdit && !form.local) return setError('Name ist erforderlich')
    if (!isEdit && !form.password) return setError('Passwort ist erforderlich')
    if (form.password && form.password.length < 8) return setError('Passwort muss mindestens 8 Zeichen haben')

    setSaving(true)
    try {
      await onSave(form)
    } catch (err) {
      setError(err.message || 'Fehler beim Speichern')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">
          {isEdit ? 'Postfach bearbeiten' : 'Neues Postfach'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* E-Mail-Adresse */}
          {!isEdit ? (
            <div>
              <label className="block text-sm text-gray-400 mb-1">E-Mail-Adresse</label>
              <div className="flex">
                <input type="text" value={form.local}
                  onChange={e => setForm({ ...form, local: e.target.value.toLowerCase() })}
                  placeholder="name"
                  className="flex-1 bg-gray-700 rounded-l-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  autoFocus />
                <span className="bg-gray-600 px-3 py-2 text-sm text-gray-300 rounded-r-lg border-l border-gray-500">
                  @{domain}
                </span>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm text-gray-400 mb-1">E-Mail-Adresse</label>
              <p className="text-sm text-white">{account.email}</p>
            </div>
          )}

          {/* Passwort */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {isEdit ? 'Neues Passwort (leer lassen = nicht aendern)' : 'Passwort'}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder={isEdit ? 'Neues Passwort...' : 'Passwort'}
                  className="w-full bg-gray-700 rounded-lg px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d={showPw
                        ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      } />
                  </svg>
                </button>
              </div>
              <button type="button"
                onClick={() => setForm({ ...form, password: generatePassword() })}
                className="px-3 py-2 text-xs bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors whitespace-nowrap">
                Generieren
              </button>
            </div>
          </div>

          {/* Anzeigename */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Anzeigename (optional)</label>
            <input type="text" value={form.displayName}
              onChange={e => setForm({ ...form, displayName: e.target.value })}
              placeholder="Max Mustermann"
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          {/* Quota */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Speicher-Limit: {form.quotaMb >= 1024 ? `${(form.quotaMb / 1024).toFixed(1)} GB` : `${form.quotaMb} MB`}
            </label>
            <input type="range" min="256" max="10240" step="256" value={form.quotaMb}
              onChange={e => setForm({ ...form, quotaMb: parseInt(e.target.value) })}
              className="w-full accent-blue-500" />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>256 MB</span>
              <span>10 GB</span>
            </div>
          </div>

          {/* Error */}
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel}
              className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors">
              Abbrechen
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50">
              {saving ? 'Speichere...' : isEdit ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
