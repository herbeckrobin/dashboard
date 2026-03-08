// Rules Dashboard — Security Audit + Desired State Uebersicht

import { useState, useEffect, useCallback } from 'react'

const CATEGORY_LABELS = {
  bootstrap: 'Bootstrap',
  setup: 'Setup',
  security: 'Security',
  infra: 'Infrastruktur',
  monitoring: 'Monitoring',
}

const SEVERITY_COLORS = {
  critical: 'text-red-400 bg-red-900/30',
  high: 'text-orange-400 bg-orange-900/30',
  medium: 'text-yellow-400 bg-yellow-900/30',
  low: 'text-blue-400 bg-blue-900/30',
}

function ScoreBadge({ score }) {
  const color = score >= 90 ? 'text-green-400 border-green-500/30 bg-green-900/20'
    : score >= 70 ? 'text-yellow-400 border-yellow-500/30 bg-yellow-900/20'
    : 'text-red-400 border-red-500/30 bg-red-900/20'
  return (
    <div className={`text-5xl font-bold border-2 rounded-2xl px-8 py-4 ${color}`}>
      {score}%
    </div>
  )
}

function RuleRow({ result, onEnforce }) {
  const [enforcing, setEnforcing] = useState(false)

  const handleEnforce = async () => {
    setEnforcing(true)
    await onEnforce(result.ruleId, result.projectId)
    setEnforcing(false)
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${result.passed ? 'bg-gray-800/50' : 'bg-gray-800'}`}>
      <span className={`text-lg ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
        {result.passed ? '✓' : '✗'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-200">{result.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${SEVERITY_COLORS[result.severity]}`}>
            {result.severity}
          </span>
          {result.projectName && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
              {result.projectName}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {result.actual}
          {!result.passed && result.expected && <span className="text-gray-600"> → {result.expected}</span>}
        </div>
      </div>
      {!result.passed && result.enforceable && (
        <button
          onClick={handleEnforce}
          disabled={enforcing}
          className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-colors whitespace-nowrap"
        >
          {enforcing ? 'Wird behoben...' : 'Fix'}
        </button>
      )}
    </div>
  )
}

function CategorySection({ category, results, onEnforce }) {
  const [expanded, setExpanded] = useState(true)
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length

  return (
    <div className="mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 w-full text-left mb-3"
      >
        <span className="text-gray-500">{expanded ? '▼' : '▶'}</span>
        <h3 className="text-lg font-semibold text-gray-200">
          {CATEGORY_LABELS[category] || category}
        </h3>
        <div className="flex gap-2 ml-auto">
          {passed > 0 && <span className="text-xs px-2 py-0.5 rounded bg-green-900/30 text-green-400">{passed} OK</span>}
          {failed > 0 && <span className="text-xs px-2 py-0.5 rounded bg-red-900/30 text-red-400">{failed} fehlgeschlagen</span>}
        </div>
      </button>
      {expanded && (
        <div className="space-y-1.5 ml-6">
          {results.map(r => (
            <RuleRow key={`${r.ruleId}-${r.projectId || 'server'}`} result={r} onEnforce={onEnforce} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function RulesDashboard() {
  const [audit, setAudit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [auditing, setAuditing] = useState(false)
  const [enforcingAll, setEnforcingAll] = useState(false)
  const [message, setMessage] = useState(null)

  const fetchAudit = useCallback(async () => {
    try {
      const res = await fetch('/api/rules/audit')
      const data = await res.json()
      setAudit(data.audit)
    } catch (err) {
      console.error('Audit laden fehlgeschlagen:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAudit() }, [fetchAudit])

  // Polling waehrend Audit laeuft
  useEffect(() => {
    if (!auditing) return
    const interval = setInterval(async () => {
      const res = await fetch('/api/rules/audit?status=true')
      const data = await res.json()
      if (data.status?.status === 'done' || !data.status) {
        setAuditing(false)
        await fetchAudit()
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [auditing, fetchAudit])

  const startAudit = async () => {
    setAuditing(true)
    setMessage(null)
    await fetch('/api/rules/audit', { method: 'POST' })
  }

  const handleEnforce = async (ruleId, projectId) => {
    try {
      const res = await fetch('/api/rules/enforce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId, projectId }),
      })
      const data = await res.json()
      if (data.error) {
        setMessage({ type: 'error', text: data.error })
      } else if (data.verified) {
        setMessage({ type: 'success', text: `${ruleId} behoben` })
        await fetchAudit() // Ergebnis aktualisieren
      } else {
        setMessage({ type: 'warning', text: `${ruleId} angewendet, aber Verifikation fehlgeschlagen` })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  const handleEnforceAll = async () => {
    setEnforcingAll(true)
    setMessage(null)
    try {
      const res = await fetch('/api/rules/enforce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enforceAll: true }),
      })
      const data = await res.json()
      setMessage({
        type: 'success',
        text: `${data.enforced} behoben, ${data.skipped} uebersprungen, ${data.failed} fehlgeschlagen`,
      })
      await fetchAudit()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
    setEnforcingAll(false)
  }

  // Ergebnisse nach Kategorie gruppieren
  const grouped = {}
  if (audit?.results) {
    for (const r of audit.results) {
      if (!grouped[r.category]) grouped[r.category] = []
      grouped[r.category].push(r)
    }
  }
  const categoryOrder = ['bootstrap', 'setup', 'security', 'infra', 'monitoring']

  const failedEnforceable = audit?.results?.filter(r => !r.passed && r.enforceable).length || 0

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Server Rules</h1>
            <p className="text-sm text-gray-500 mt-1">Desired-State Audit + Enforce</p>
          </div>
          <div className="flex gap-3">
            {failedEnforceable > 0 && (
              <button
                onClick={handleEnforceAll}
                disabled={enforcingAll || auditing}
                className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {enforcingAll ? 'Wird behoben...' : `Alle beheben (${failedEnforceable})`}
              </button>
            )}
            <button
              onClick={startAudit}
              disabled={auditing}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {auditing ? 'Audit laeuft...' : 'Audit starten'}
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 px-4 py-3 rounded-lg text-sm ${
            message.type === 'error' ? 'bg-red-900/30 text-red-300' :
            message.type === 'warning' ? 'bg-yellow-900/30 text-yellow-300' :
            'bg-green-900/30 text-green-300'
          }`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-500 py-20">Lade...</div>
        ) : !audit ? (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">Noch kein Audit durchgefuehrt</p>
            <button
              onClick={startAudit}
              disabled={auditing}
              className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium transition-colors"
            >
              Ersten Audit starten
            </button>
          </div>
        ) : (
          <>
            {/* Score + Meta */}
            <div className="flex items-center gap-8 mb-8 p-6 rounded-xl bg-gray-800/50">
              <ScoreBadge score={audit.score} />
              <div className="space-y-1">
                <div className="text-sm text-gray-400">
                  {audit.passed} bestanden / {audit.failed} fehlgeschlagen / {audit.totalRules} gesamt
                </div>
                <div className="text-xs text-gray-600">
                  Letzter Audit: {new Date(audit.timestamp).toLocaleString('de-DE')}
                  {audit.durationMs && ` (${Math.round(audit.durationMs / 1000)}s)`}
                </div>
              </div>
            </div>

            {/* Categories */}
            {categoryOrder.map(cat => (
              grouped[cat] ? (
                <CategorySection
                  key={cat}
                  category={cat}
                  results={grouped[cat]}
                  onEnforce={handleEnforce}
                />
              ) : null
            ))}
          </>
        )}
      </div>
    </div>
  )
}
