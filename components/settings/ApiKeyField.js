// Wiederverwendbares API-Key Eingabefeld mit Show/Hide + Speichern

import { useState } from 'react'

export default function ApiKeyField({ label, description, value, onChange, placeholder, onSave, saving, message, buttonLabel }) {
  const [show, setShow] = useState(false)

  const content = (
    <>
      {label && <h2 className="text-lg sm:text-xl font-semibold mb-4">{label}</h2>}
      {description && <p className="text-gray-400 text-sm mb-4">{description}</p>}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input type={show ? 'text' : 'password'} value={value}
          onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="flex-1 bg-gray-700 text-white rounded px-4 py-3 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button onClick={() => setShow(!show)}
          className="bg-gray-600 hover:bg-gray-500 px-4 py-3 rounded sm:flex-shrink-0">
          {show ? 'Verbergen' : 'Anzeigen'}
        </button>
      </div>
      {message?.text && (
        <p className={`mb-3 ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
          {message.text}
        </p>
      )}
      <button onClick={onSave} disabled={saving}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-6 py-3 rounded-lg font-medium">
        {saving ? 'Speichert...' : (buttonLabel || 'Speichern')}
      </button>
    </>
  )

  // Ohne Label: kein Wrapper (fuer eingebettete Nutzung z.B. in AI-Section)
  if (!label) return content

  return (
    <div className="bento-card p-4 sm:p-6">
      {content}
    </div>
  )
}
