// Bootstrap-Fortschrittsanzeige — zeigt aktiven Enforce-Status als Banner

import { useState, useEffect } from 'react'

const CATEGORY_LABELS = {
  bootstrap: 'Infrastruktur',
  security: 'Sicherheit',
  infra: 'Server-Dienste',
  setup: 'Projekt-Setup',
  monitoring: 'Monitoring',
}

export default function BootstrapBanner() {
  const [status, setStatus] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let interval
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/rules/enforce')
        if (!res.ok) return
        const data = await res.json()
        setStatus(data.status)
      } catch {}
    }

    // Sofort pruefen, dann alle 2s
    fetchStatus()
    interval = setInterval(fetchStatus, 2000)
    return () => clearInterval(interval)
  }, [])

  // Nichts anzeigen wenn kein Status oder dismissed
  if (!status) return null
  if (dismissed && status.status === 'done') return null

  const isRunning = status.status === 'running'
  const isDone = status.status === 'done'
  const progress = status.total > 0 ? Math.round((status.current / status.total) * 100) : 0

  // Vergangene Zeit berechnen
  const elapsed = status.startedAt
    ? Math.round((Date.now() - new Date(status.startedAt).getTime()) / 1000)
    : 0
  const elapsedMin = Math.floor(elapsed / 60)
  const elapsedSec = elapsed % 60

  if (isDone) {
    return (
      <div className="bg-green-900/50 border-b border-green-700/50">
        <div className="flex items-center justify-between px-4 md:px-8 py-2">
          <div className="flex items-center gap-3 text-sm text-green-300">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>
              Server-Setup abgeschlossen — {status.enforced} installiert, {status.skipped} bereits OK
              {status.failed > 0 && <span className="text-yellow-400">, {status.failed} fehlgeschlagen</span>}
            </span>
          </div>
          <button onClick={() => setDismissed(true)} className="text-green-400 hover:text-white p-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  if (!isRunning) return null

  const categoryLabel = CATEGORY_LABELS[status.currentCategory] || status.currentCategory

  return (
    <div className="bg-blue-900/40 border-b border-blue-700/50">
      <div className="px-4 md:px-8 py-3">
        {/* Obere Zeile: Titel + Zaehler */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm text-blue-300">
            <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="font-medium">Server wird eingerichtet...</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>{status.current}/{status.total}</span>
            <span>{elapsedMin}:{String(elapsedSec).padStart(2, '0')}</span>
            <span>{progress}%</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden mb-1.5">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Aktueller Schritt */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="truncate">
            <span className="text-gray-500">{categoryLabel}:</span>{' '}
            {status.currentRule || '...'}
          </span>
          {(status.enforced > 0 || status.failed > 0) && (
            <span className="flex-shrink-0 ml-2">
              {status.enforced > 0 && <span className="text-green-400">{status.enforced} OK</span>}
              {status.failed > 0 && <span className="text-red-400 ml-2">{status.failed} Fehler</span>}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
