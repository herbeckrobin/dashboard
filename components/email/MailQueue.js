// Mail-Queue-Viewer mit Flush und Delete

import { useState } from 'react'

export default function MailQueue({ queue, onFlush, onDelete }) {
  const [flushing, setFlushing] = useState(false)

  if (!queue || queue.length === 0) return null

  const handleFlush = async () => {
    setFlushing(true)
    await onFlush?.()
    setFlushing(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">{queue.length} Nachrichten in der Queue</span>
        <button onClick={handleFlush} disabled={flushing}
          className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50">
          {flushing ? 'Sende...' : 'Alle erneut senden'}
        </button>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {queue.map((item, i) => (
          <div key={item.queue_id || i}
            className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 text-sm">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white truncate">{item.sender || 'Unbekannt'}</span>
                <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                <span className="text-gray-400 truncate">
                  {item.recipients?.map(r => r.address).join(', ') || 'Unbekannt'}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span>ID: {item.queue_id}</span>
                {item.message_size && <span>{Math.round(item.message_size / 1024)} KB</span>}
                {item.arrival_time && (
                  <span>{new Date(item.arrival_time * 1000).toLocaleString('de-DE')}</span>
                )}
              </div>
            </div>
            <button onClick={() => onDelete?.(item.queue_id)}
              className="p-1.5 text-gray-400 hover:text-red-400 rounded transition-colors flex-shrink-0"
              title="Aus Queue entfernen">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
