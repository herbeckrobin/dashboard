// DNS-Eintraege einer Projekt-Domain anzeigen mit Status-Checks

import { useState, useEffect, useCallback } from 'react'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button onClick={handleCopy}
      className="p-1 text-gray-400 hover:text-white rounded transition-colors flex-shrink-0"
      title="Kopieren">
      {copied ? (
        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  )
}

function StatusDot({ ok, label }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
        ok === null ? 'bg-gray-600' : ok ? 'bg-green-500' : 'bg-red-500'
      }`} />
      <span className="text-gray-300">{label}</span>
    </div>
  )
}

function RecordGroup({ type, items }) {
  if (!items || items.length === 0) return null

  return (
    <div>
      <div className="text-xs font-mono text-blue-400 font-medium mb-1.5">{type}</div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 p-2 bg-gray-800/50 rounded border border-gray-700/50">
            <code className="text-xs text-gray-300 bg-gray-900/50 px-2 py-1 rounded break-all flex-1">
              {typeof item === 'string' ? item : item.display}
            </code>
            <CopyButton text={typeof item === 'string' ? item : item.copy} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DnsCheck({ projectId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchDns = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/dns`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Fehler')
      }
      setData(await res.json())
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => { fetchDns() }, [fetchDns])

  if (loading && !data) {
    return <p className="text-gray-500 text-sm">DNS wird abgefragt...</p>
  }

  if (error && !data) {
    return <p className="text-red-400 text-sm">{error}</p>
  }

  if (!data) return null

  const { records, www, checks, serverIp } = data

  // Records fuer Anzeige aufbereiten
  const mxItems = records.mx.map(r => ({
    display: `${r.priority} ${r.exchange}`,
    copy: r.exchange
  }))
  const txtItems = records.txt.map(t => t)

  return (
    <div className="space-y-4">
      {/* Checks */}
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <StatusDot
          ok={checks.pointsToServer}
          label={`A-Record → Server${serverIp ? ` (${serverIp})` : ''}`}
        />
        {checks.wwwExists !== undefined && (
          <StatusDot ok={checks.wwwExists} label="www-Eintrag vorhanden" />
        )}
        {checks.wwwPointsToServer !== undefined && checks.wwwExists && (
          <StatusDot ok={checks.wwwPointsToServer} label="www → Server" />
        )}
      </div>

      {/* Refresh */}
      <div className="flex justify-end">
        <button onClick={fetchDns} disabled={loading}
          className="text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-1">
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? 'Prüft...' : 'Erneut prüfen'}
        </button>
      </div>

      {/* Records */}
      <div className="space-y-4">
        <RecordGroup type="A" items={records.a} />
        <RecordGroup type="AAAA" items={records.aaaa} />
        <RecordGroup type="CNAME" items={records.cname} />
        <RecordGroup type="MX" items={mxItems} />
        <RecordGroup type="TXT" items={txtItems} />
        <RecordGroup type="NS" items={records.ns} />
      </div>

      {/* www-Records */}
      {www && (www.a.length > 0 || www.cname.length > 0) && (
        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-gray-400 mb-3">www-Subdomain</h4>
          <div className="space-y-4">
            <RecordGroup type="A" items={www.a} />
            <RecordGroup type="CNAME" items={www.cname} />
          </div>
        </div>
      )}

      {/* Keine Records */}
      {records.a.length === 0 && records.aaaa.length === 0 && records.cname.length === 0 &&
       records.mx.length === 0 && records.txt.length === 0 && records.ns.length === 0 && (
        <p className="text-gray-500 text-sm">Keine DNS-Einträge gefunden.</p>
      )}
    </div>
  )
}
