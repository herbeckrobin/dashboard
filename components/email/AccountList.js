// Postfach-Liste mit Quota-Balken und Aktionen

import { useState } from 'react'

function QuotaBar({ usedBytes, limitMb }) {
  if (!limitMb || limitMb <= 0) return null
  const usedMb = (usedBytes || 0) / 1024 / 1024
  const percent = Math.min(100, Math.round((usedMb / limitMb) * 100))
  const color = percent > 90 ? 'bg-red-500' : percent > 70 ? 'bg-yellow-500' : 'bg-blue-500'

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs text-gray-500">{Math.round(usedMb)} / {limitMb} MB</span>
    </div>
  )
}

function AutoReplyBadge({ autoReply }) {
  if (!autoReply?.enabled) return null
  const now = new Date().toISOString().split('T')[0]
  if (autoReply.startDate && now < autoReply.startDate) {
    return <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded flex-shrink-0" title={`Geplant ab ${autoReply.startDate}`}>Geplant</span>
  }
  if (autoReply.endDate && now > autoReply.endDate) {
    return <span className="text-xs bg-orange-600/20 text-orange-400 px-2 py-0.5 rounded flex-shrink-0" title={`Abgelaufen seit ${autoReply.endDate}`}>Abgelaufen</span>
  }
  return <span className="text-xs bg-yellow-600/20 text-yellow-400 px-2 py-0.5 rounded flex-shrink-0">Auto-Reply</span>
}

export default function AccountList({ accounts, onEdit, onDelete, onToggle, onAutoReply }) {
  const [confirmDelete, setConfirmDelete] = useState(null)

  return (
    <div className="space-y-2">
      {accounts.length === 0 && (
        <p className="text-gray-500 text-sm py-4">Keine Postfaecher vorhanden</p>
      )}
      {accounts.map(account => (
        <div key={account.id}
          className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
          {/* Status + E-Mail */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${account.enabled ? 'bg-green-500' : 'bg-gray-500'}`} />
              <span className="text-sm font-medium text-white truncate">{account.email}</span>
            </div>
            {account.displayName && (
              <p className="text-xs text-gray-500 mt-0.5 ml-4">{account.displayName}</p>
            )}
          </div>

          {/* Auto-Reply Badge (klickbar) */}
          <button onClick={() => onAutoReply?.(account)}
            className="flex-shrink-0" title="Autoresponder konfigurieren">
            {account.autoReply?.enabled
              ? <AutoReplyBadge autoReply={account.autoReply} />
              : <span className="text-xs bg-gray-700/50 text-gray-500 px-2 py-0.5 rounded hover:text-gray-300 transition-colors">Auto-Reply</span>
            }
          </button>

          {/* Quota */}
          <div className="flex-shrink-0 hidden sm:block">
            <QuotaBar usedBytes={account.usedBytes} limitMb={account.quotaMb} />
          </div>

          {/* Aktionen */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => onToggle?.(account)}
              className="p-1.5 text-gray-400 hover:text-white rounded transition-colors"
              title={account.enabled ? 'Deaktivieren' : 'Aktivieren'}>
              {account.enabled ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              )}
            </button>

            <button onClick={() => onEdit?.(account)}
              className="p-1.5 text-gray-400 hover:text-blue-400 rounded transition-colors"
              title="Bearbeiten">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>

            {confirmDelete === account.id ? (
              <div className="flex items-center gap-1">
                <button onClick={() => { onDelete?.(account); setConfirmDelete(null) }}
                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                  Ja
                </button>
                <button onClick={() => setConfirmDelete(null)}
                  className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors">
                  Nein
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(account.id)}
                className="p-1.5 text-gray-400 hover:text-red-400 rounded transition-colors"
                title="Loeschen">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
