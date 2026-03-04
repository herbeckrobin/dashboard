// Umgebungsvariablen Editor (Key-Value Paare)

import { useState } from 'react'

export default function EnvVars({ value = [], onChange }) {
  const [showValues, setShowValues] = useState({})

  const handleAdd = () => {
    onChange([...value, { key: '', value: '' }])
  }

  const handleRemove = (index) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const handleChange = (index, field, val) => {
    const updated = value.map((item, i) => i === index ? { ...item, [field]: val } : item)
    onChange(updated)
  }

  const toggleShow = (index) => {
    setShowValues(prev => ({ ...prev, [index]: !prev[index] }))
  }

  if (value.length === 0) {
    return (
      <div>
        <p className="text-gray-500 text-sm mb-2">Keine Variablen konfiguriert</p>
        <button type="button" onClick={handleAdd}
          className="text-blue-400 hover:text-blue-300 text-sm">
          + Variable hinzufügen
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {value.map((env, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            type="text"
            value={env.key}
            onChange={e => handleChange(i, 'key', e.target.value)}
            placeholder="KEY"
            className="w-1/3 bg-gray-700 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex-1 flex gap-1">
            <input
              type={showValues[i] ? 'text' : 'password'}
              value={env.value}
              onChange={e => handleChange(i, 'value', e.target.value)}
              placeholder="value"
              className="flex-1 bg-gray-700 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="button" onClick={() => toggleShow(i)}
              className="bg-gray-600 hover:bg-gray-500 px-2 py-2 rounded text-xs flex-shrink-0" title={showValues[i] ? 'Verbergen' : 'Anzeigen'}>
              {showValues[i] ? '🙈' : '👁'}
            </button>
          </div>
          <button type="button" onClick={() => handleRemove(i)}
            className="bg-red-600/30 hover:bg-red-600/50 text-red-400 px-2 py-2 rounded text-sm flex-shrink-0" title="Entfernen">
            ✕
          </button>
        </div>
      ))}
      <button type="button" onClick={handleAdd}
        className="text-blue-400 hover:text-blue-300 text-sm">
        + Variable hinzufügen
      </button>
    </div>
  )
}
