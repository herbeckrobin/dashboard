// Deploy-Log Komponente — zeigt Live-Deploy-Status mit Steps
// Verwendet in Dashboard (mit Estimates + Close) und New-Project (mit Domain-Link)

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { formatDuration } from '../lib/format'

function StepTimer({ startedAt }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!startedAt) return
    const start = new Date(startedAt).getTime()
    const tick = () => setElapsed(Date.now() - start)
    tick()
    const timer = setInterval(tick, 500)
    return () => clearInterval(timer)
  }, [startedAt])
  return <span className="text-gray-500">{formatDuration(elapsed)}</span>
}

export function TriggerBadge({ trigger }) {
  if (trigger === 'webhook') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-purple-600/20 text-purple-400">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        Webhook
      </span>
    )
  }
  if (trigger === 'deploy') {
    return <span className="text-xs px-1.5 py-0.5 rounded bg-green-600/20 text-green-400">Deploy</span>
  }
  if (trigger === 'cron') {
    return <span className="text-xs px-1.5 py-0.5 rounded bg-gray-600/20 text-gray-400">Cron</span>
  }
  return (
    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-400">Manuell</span>
  )
}

export default function DeployLog({
  projectId,
  onClose,            // Dashboard-Modus: Zeigt "Schliessen" Button
  showEstimates,      // Dashboard-Modus: Zeigt geschaetzte Zeiten
  showTrigger,        // Dashboard-Modus: Zeigt Trigger-Badge + Info
  projectDomain,      // New-Project-Modus: Zeigt "Seite oeffnen" Link
  showDashboardLink,  // New-Project-Modus: Zeigt "Zum Dashboard" Link
  onLogUpdate,        // Callback bei Log-Updates (fuer FileTree etc.)
}) {
  const [log, setLog] = useState(null)
  const [estimates, setEstimates] = useState({})
  const [expandedSteps, setExpandedSteps] = useState(new Set())
  const [aborting, setAborting] = useState(false)
  const bottomRef = useRef(null)
  const terminalRef = useRef(null)
  const hasScrolledRef = useRef(false)

  useEffect(() => {
    if (!projectId) return
    hasScrolledRef.current = false

    const poll = setInterval(() => {
      fetch(`/api/projects/${projectId}/logs`)
        .then(res => res.json())
        .then(data => {
          if (data.log) {
            setLog(data.log)
            if (onLogUpdate) onLogUpdate(data.log)
            if (showEstimates && data.estimates) setEstimates(data.estimates)
            if (data.log.done) clearInterval(poll)
          }
        })
        .catch(() => {})
    }, 1500)

    // Sofort laden
    fetch(`/api/projects/${projectId}/logs`)
      .then(res => res.json())
      .then(data => {
        if (data.log) {
          setLog(data.log)
          if (onLogUpdate) onLogUpdate(data.log)
        }
        if (showEstimates && data.estimates) setEstimates(data.estimates)
      })

    return () => clearInterval(poll)
  }, [projectId, showEstimates])

  // Einmalig zum Deploy-Log scrollen beim ersten Laden
  useEffect(() => {
    if (log && !hasScrolledRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      hasScrolledRef.current = true
    }
  }, [log])

  // Auto-scroll Terminal nach unten bei neuem Output
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [log?.steps?.find(s => s.status === 'running')?.liveOutput])

  const toggleStep = (i) => {
    setExpandedSteps(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  if (!log) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 mt-3 text-gray-400 text-sm">
        Deploy wird gestartet...
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden mt-3">
      <div className="px-3 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!log.done && <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />}
          {log.done && log.success && <span className="w-2 h-2 bg-green-400 rounded-full" />}
          {log.done && !log.success && <span className="w-2 h-2 bg-red-400 rounded-full" />}
          <span className="font-medium text-xs">
            {!log.done ? 'Deploy läuft...' : log.success ? 'Deploy erfolgreich' : 'Deploy fehlgeschlagen'}
          </span>
          {showTrigger && <TriggerBadge trigger={log.trigger || 'manual'} />}
        </div>
        <div className="flex items-center gap-2">
          {showEstimates && !log.done && log.startedAt && (
            <span className="text-xs text-gray-400">
              <StepTimer startedAt={log.startedAt} />
              {Object.keys(estimates).length > 0 && (() => {
                const totalEst = log.steps.reduce((sum, s) => sum + (estimates[s.name] || 0), 0)
                return totalEst > 0 ? <span className="text-gray-500"> / ~{formatDuration(totalEst)}</span> : null
              })()}
            </span>
          )}
          {!log.done && (
            <button
              onClick={async () => {
                if (aborting) return
                if (!confirm('Deploy wirklich abbrechen?')) return
                setAborting(true)
                try {
                  await fetch(`/api/projects/${projectId}/abort-deploy`, { method: 'POST' })
                } catch {}
              }}
              disabled={aborting}
              className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                aborting
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600/20 text-red-400 hover:bg-red-600/40 hover:text-red-300'
              }`}
            >
              {aborting ? 'Wird abgebrochen...' : 'STOP'}
            </button>
          )}
          {log.done && onClose && (
            <button onClick={onClose} className="text-gray-500 hover:text-white text-xs">Schliessen</button>
          )}
          {log.done && log.success && projectDomain && (
            <a href={`https://${projectDomain}`} target="_blank" rel="noopener"
              className="text-blue-400 hover:text-blue-300 text-sm">
              Seite öffnen →
            </a>
          )}
        </div>
      </div>

      {showTrigger && log.triggerInfo && (log.triggerInfo.pusher || log.triggerInfo.commitMessage) && (
        <div className="px-3 py-1.5 bg-gray-800/50 border-b border-gray-700 text-xs text-gray-500">
          {log.triggerInfo.pusher && <span>von <span className="text-gray-400">{log.triggerInfo.pusher}</span></span>}
          {log.triggerInfo.branch && <span> auf <span className="text-gray-400">{log.triggerInfo.branch}</span></span>}
          {log.triggerInfo.commitMessage && <span> — &quot;{log.triggerInfo.commitMessage.trim()}&quot;</span>}
        </div>
      )}

      <div className="p-3 space-y-1 font-mono text-xs max-h-96 overflow-y-auto">
        {log.steps.map((step, i) => {
          const est = estimates[step.name]
          const stepDuration = step.startedAt && step.finishedAt
            ? new Date(step.finishedAt) - new Date(step.startedAt)
            : null
          const hasOutput = step.liveOutput || (step.output && step.output !== 'OK')
          const isRunning = step.status === 'running'
          const isExpanded = isRunning || expandedSteps.has(i)
          const terminalOutput = isRunning ? step.liveOutput : (step.liveOutput || step.output)
          return (
            <div key={i}>
              <div
                className={`flex items-center gap-2 ${hasOutput || isRunning ? 'cursor-pointer hover:bg-gray-800/50 rounded px-1 -mx-1' : ''}`}
                onClick={() => hasOutput && toggleStep(i)}
              >
                {step.status === 'pending' && <span className="text-gray-500">○</span>}
                {step.status === 'running' && <span className="text-yellow-400 animate-pulse">●</span>}
                {step.status === 'done' && <span className="text-green-400">✓</span>}
                {step.status === 'error' && <span className="text-red-400">✗</span>}
                <span className={
                  step.status === 'pending' ? 'text-gray-500' :
                  step.status === 'running' ? 'text-yellow-300' :
                  step.status === 'done' ? 'text-green-300' : 'text-red-300'
                }>{step.name}</span>
                {hasOutput && !isRunning && (
                  <span className="text-gray-600 text-[10px]">{expandedSteps.has(i) ? '▼' : '▶'}</span>
                )}
                <span className="ml-auto text-xs tabular-nums flex-shrink-0">
                  {step.status === 'running' && step.startedAt && (
                    <span className="text-yellow-400/70">
                      <StepTimer startedAt={step.startedAt} />
                      {est ? <span className="text-gray-500"> / ~{formatDuration(est)}</span> : null}
                    </span>
                  )}
                  {step.status === 'done' && stepDuration != null && (
                    <span className="text-gray-400">{formatDuration(stepDuration)}</span>
                  )}
                  {step.status === 'pending' && est && (
                    <span className="text-gray-500">~{formatDuration(est)}</span>
                  )}
                </span>
              </div>
              {isExpanded && terminalOutput && (
                <pre
                  ref={isRunning ? terminalRef : null}
                  className={`ml-5 mt-1 mb-1 p-2 rounded text-[11px] whitespace-pre-wrap break-all max-h-32 overflow-y-auto ${
                    step.status === 'error'
                      ? 'bg-red-950/50 border border-red-900/50 text-red-400/80'
                      : 'bg-black/60 border border-gray-700/50 text-green-400/80'
                  }`}
                >{terminalOutput}</pre>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {log.done && (
        <div className={`px-3 py-2 border-t text-xs ${log.success ? 'border-green-800 bg-green-900/30 text-green-300' : 'border-red-800 bg-red-900/30 text-red-300'}`}>
          <div className="flex items-center justify-between">
            <span>
              {log.success
                ? `Fertig in ${((new Date(log.finishedAt) - new Date(log.startedAt)) / 1000).toFixed(1)}s`
                : 'Abgebrochen wegen Fehler'}
            </span>
            {showDashboardLink && (
              <Link href="/" className="text-sm text-gray-400 hover:text-white">
                Zum Dashboard →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
