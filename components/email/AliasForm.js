// Alias/Weiterleitung erstellen und Liste anzeigen

import { useState } from 'react'

export default function AliasForm({ domain, aliases, onAdd, onDelete }) {
  const [source, setSource] = useState('')
  const [destination, setDestination] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    if (!source || !destination) return setError('Quelle und Ziel sind erforderlich')

    const fullSource = source.includes('@') ? source : `${source}@${domain}`
    setSaving(true)
    try {
      await onAdd({ source: fullSource, destination, domain })
      setSource('')
      setDestination('')
    } catch (err) {
      setError(err.message || 'Fehler beim Erstellen')
    }
    setSaving(false)
  }

  return (
    <div>
      {/* Alias-Liste */}
      <div className="space-y-2 mb-4">
        {aliases.length === 0 && (
          <p className="text-gray-500 text-sm py-2">Keine Weiterleitungen vorhanden</p>
        )}
        {aliases.map(alias => (
          <div key={alias.id}
            className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white truncate">{alias.source}</span>
                <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                <span className="text-blue-400 truncate">{alias.destination}</span>
              </div>
            </div>
            {confirmDelete === alias.id ? (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => { onDelete?.(alias.id); setConfirmDelete(null) }}
                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">Ja</button>
                <button onClick={() => setConfirmDelete(null)}
                  className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700">Nein</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(alias.id)}
                className="p-1.5 text-gray-400 hover:text-red-400 rounded transition-colors flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Neuer Alias */}
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
        <div className="flex flex-1">
          <input type="text" value={source}
            onChange={e => setSource(e.target.value.toLowerCase())}
            placeholder="alias"
            className="flex-1 bg-gray-700 rounded-l-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          <span className="bg-gray-600 px-2 py-2 text-sm text-gray-300 border-x border-gray-500">@{domain}</span>
          <span className="bg-gray-700 px-2 py-2 text-gray-500 text-sm">→</span>
          <input type="email" value={destination}
            onChange={e => setDestination(e.target.value)}
            placeholder="ziel@beispiel.de"
            className="flex-1 bg-gray-700 rounded-r-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <button type="submit" disabled={saving}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">
          {saving ? '...' : 'Hinzufuegen'}
        </button>
      </form>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  )
}
