// Performance-Modal: Scores, Web Vitals, Standards, Chart

import { useState, useEffect } from 'react'
import { formatTimeAgo } from '../lib/format'
import { TriggerBadge } from './DeployLog'

function ScoreGauge({ label, value }) {
  if (value == null) return null
  const color = value >= 90 ? '#22c55e' : value >= 50 ? '#eab308' : '#ef4444'
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (value / 100) * circumference
  return (
    <div className="flex flex-col items-center">
      <svg width="80" height="80" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#374151" strokeWidth="8" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 50 50)" />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
          fill={color} fontSize="24" fontWeight="bold">{value}</text>
      </svg>
      <span className="text-xs text-gray-400 mt-1">{label}</span>
    </div>
  )
}

function WebVital({ label, value, unit, good, poor }) {
  if (value == null) return null
  const color = value <= good ? 'text-green-400' : value <= poor ? 'text-yellow-400' : 'text-red-400'
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-400">{label}</span>
      <span className={`font-mono ${color}`}>
        {unit === 'ms' ? `${value}ms` : value.toFixed(2)}
      </span>
    </div>
  )
}

function PerformanceChart({ checks }) {
  if (!checks || checks.length < 2) return null
  const scores = checks.map(c => c.pagespeed?.performance ?? c.lighthouse?.performance ?? 0).reverse()
  const count = scores.length
  const svgWidth = 400
  const barWidth = Math.min(30, Math.floor((svgWidth - 10) / count) - 4)
  const gap = 4
  const totalWidth = count * (barWidth + gap) - gap
  const height = 80
  return (
    <div className="mt-4">
      <div className="text-xs text-gray-400 mb-2">Verlauf (letzte {count} Checks)</div>
      <svg viewBox={`0 0 ${totalWidth} ${height}`} className="w-full" style={{ maxHeight: '80px' }}
        preserveAspectRatio="xMidYEnd meet">
        {scores.map((score, i) => {
          const barHeight = Math.max(2, (score / 100) * height)
          const color = score >= 90 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444'
          return (
            <rect key={i} x={i * (barWidth + gap)} y={height - barHeight}
              width={barWidth} height={barHeight} fill={color} rx="2" />
          )
        })}
      </svg>
    </div>
  )
}

export default function PerformanceModal({ project, onClose }) {
  const [perfData, setPerfData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Initial laden
  useEffect(() => {
    if (!project) return
    setLoading(true)
    fetch(`/api/projects/${project.id}/performance`)
      .then(r => r.json())
      .then(data => { setPerfData(data); setLoading(false) })
      .catch(() => { setPerfData(null); setLoading(false) })
  }, [project])

  // Polling alle 3s
  useEffect(() => {
    if (!project) return
    const poll = setInterval(() => {
      fetch(`/api/projects/${project.id}/performance`)
        .then(r => r.json())
        .then(data => setPerfData(data))
        .catch(() => {})
    }, 3000)
    return () => clearInterval(poll)
  }, [project])

  const handleCheckNow = async () => {
    if (!project) return
    setPerfData(prev => ({
      ...prev,
      status: { status: 'checking', step: 'pagespeed', startedAt: new Date().toISOString() }
    }))
    await fetch(`/api/projects/${project.id}/performance`, { method: 'POST' })
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Performance: {project.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg">&times;</button>
        </div>

        {loading && <p className="text-gray-400">Lädt...</p>}

        {perfData && (
          <>
            {perfData.status?.status === 'checking' && (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                <span className="text-yellow-300 text-sm">
                  Check läuft... ({perfData.status.step === 'pagespeed' ? 'PageSpeed' : perfData.status.step === 'lighthouse' ? 'Lighthouse' : 'Standards'})
                </span>
              </div>
            )}

            {perfData.latest && (
              <>
                <div className="grid grid-cols-4 gap-2 mb-6">
                  <ScoreGauge label="Performance" value={perfData.latest.pagespeed?.performance ?? perfData.latest.lighthouse?.performance} />
                  <ScoreGauge label="Zugängl." value={perfData.latest.pagespeed?.accessibility ?? perfData.latest.lighthouse?.accessibility} />
                  <ScoreGauge label="Best Pract." value={perfData.latest.pagespeed?.bestPractices ?? perfData.latest.lighthouse?.bestPractices} />
                  <ScoreGauge label="SEO" value={perfData.latest.pagespeed?.seo ?? perfData.latest.lighthouse?.seo} />
                </div>

                {perfData.latest.lighthouse && perfData.latest.lighthouse.fcp != null && (
                  <div className="bg-gray-900 rounded-lg p-4 mb-4">
                    <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Core Web Vitals</h3>
                    <div className="space-y-2">
                      <WebVital label="FCP (First Contentful Paint)" value={perfData.latest.lighthouse.fcp} unit="ms" good={1800} poor={3000} />
                      <WebVital label="LCP (Largest Contentful Paint)" value={perfData.latest.lighthouse.lcp} unit="ms" good={2500} poor={4000} />
                      <WebVital label="CLS (Cumulative Layout Shift)" value={perfData.latest.lighthouse.cls} unit="" good={0.1} poor={0.25} />
                      <WebVital label="TBT (Total Blocking Time)" value={perfData.latest.lighthouse.tbt} unit="ms" good={200} poor={600} />
                    </div>
                  </div>
                )}

                {perfData.latest.websiteChecks && (
                  <div className="bg-gray-900 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Website Standards</h3>
                      <span className={`text-sm font-bold ${
                        perfData.latest.websiteChecks.score >= 90 ? 'text-green-400' :
                        perfData.latest.websiteChecks.score >= 50 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {perfData.latest.websiteChecks.score}% ({perfData.latest.websiteChecks.passedChecks}/{perfData.latest.websiteChecks.totalChecks})
                      </span>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(perfData.latest.websiteChecks.categories).map(([key, cat]) => (
                        <div key={key}>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-gray-300 font-medium">{cat.name}</span>
                            <span className={
                              cat.score === 100 ? 'text-green-400' :
                              cat.score > 0 ? 'text-yellow-400' : 'text-red-400'
                            }>{cat.passed}/{cat.total}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {cat.checks.map((check, i) => (
                              <span key={i}
                                className={`text-xs px-1.5 py-0.5 rounded ${
                                  check.passed ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                                }`}
                                title={check.info || ''}>
                                {check.passed ? '\u2713' : '\u2717'} {check.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                  <span>Letzter Check: {formatTimeAgo(perfData.latest.timestamp)}</span>
                  <TriggerBadge trigger={perfData.latest.trigger} />
                  <span>{(perfData.latest.durationMs / 1000).toFixed(1)}s</span>
                </div>

                {perfData.latest.pagespeedError && (
                  <p className="text-xs text-red-400 mb-2">PageSpeed: {perfData.latest.pagespeedError}</p>
                )}
                {perfData.latest.lighthouseError && (
                  <p className="text-xs text-yellow-400 mb-2">Lighthouse: {perfData.latest.lighthouseError}</p>
                )}
              </>
            )}

            <PerformanceChart checks={perfData.history} />

            <button onClick={handleCheckNow}
              disabled={perfData.status?.status === 'checking'}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-4 py-2 rounded text-sm font-medium">
              {perfData.status?.status === 'checking' ? 'Check läuft...' : 'Jetzt prüfen'}
            </button>
          </>
        )}

        {!perfData?.latest && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">Noch keine Performance-Daten vorhanden</p>
            <button onClick={handleCheckNow} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm">
              Ersten Check starten
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
