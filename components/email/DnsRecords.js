// DNS-Eintraege anzeigen mit Copy-Button und Status-Ampel

import { useState } from 'react'

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

export default function DnsRecords({ records, status }) {
  const statusMap = { mx: status?.mx, spf: status?.spf, dkim: status?.dkim, dmarc: status?.dmarc }

  const getRecordStatus = (record) => {
    if (record.type === 'MX') return statusMap.mx
    if (record.host?.includes('_domainkey')) return statusMap.dkim
    if (record.host?.includes('_dmarc')) return statusMap.dmarc
    if (record.type === 'TXT' && record.value?.includes('v=spf1')) return statusMap.spf
    return null
  }

  return (
    <div className="space-y-3">
      {records.map((record, i) => {
        const ok = getRecordStatus(record)
        return (
          <div key={i} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <div className="flex items-start gap-3">
              {/* Status */}
              <div className="flex-shrink-0 mt-1">
                {ok === null ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-600 block" title="Nicht pruefbar" />
                ) : ok ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 block" title="OK" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 block" title="Fehlt" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                {/* Typ + Host */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono bg-gray-700 px-1.5 py-0.5 rounded text-blue-400">
                    {record.type}
                  </span>
                  <span className="text-sm text-gray-300 truncate">{record.host}</span>
                  {record.priority && (
                    <span className="text-xs text-gray-500">Prioritaet: {record.priority}</span>
                  )}
                </div>

                {/* Wert */}
                <div className="flex items-start gap-2">
                  <code className="text-xs text-gray-400 bg-gray-900/50 px-2 py-1 rounded break-all flex-1">
                    {record.value}
                  </code>
                  <CopyButton text={record.value} />
                </div>

                {/* Beschreibung */}
                <p className="text-xs text-gray-500 mt-1">{record.description}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
