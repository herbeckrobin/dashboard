// Einzelne Projekt-Karte im Dashboard (Grid- und Listen-Ansicht, Bento-Style)

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { formatTimeAgo } from '../lib/format'
import DeployLog, { TriggerBadge } from './DeployLog'

function PerformanceBadge({ score }) {
  if (!score) return null
  const perf = score.pagespeed?.performance ?? score.lighthouse?.performance ?? null
  if (perf === null) return null
  const color = perf >= 90 ? 'bg-green-600/20 text-green-400'
    : perf >= 50 ? 'bg-yellow-600/20 text-yellow-400'
    : 'bg-red-600/20 text-red-400'
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${color}`}
          title={`Performance: ${perf} | Zugängl.: ${score.pagespeed?.accessibility ?? '?'} | SEO: ${score.pagespeed?.seo ?? '?'}`}>
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      {perf}
    </span>
  )
}

function WebCheckBadge({ score }) {
  if (!score?.websiteChecks) return null
  const s = score.websiteChecks.score
  const color = s >= 90 ? 'bg-green-600/20 text-green-400'
    : s >= 50 ? 'bg-yellow-600/20 text-yellow-400'
    : 'bg-red-600/20 text-red-400'
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${color}`}
          title={`Standards: ${s}% (${score.websiteChecks.passedChecks}/${score.websiteChecks.totalChecks})`}>
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      {s}%
    </span>
  )
}

// Dropdown-Menü fuer Loeschen
function MoreDropdown({ project, onOpenDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" title="Weitere Aktionen">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-gray-700 rounded-lg shadow-xl border border-gray-600 py-1 z-20 min-w-[140px]">
          <button onClick={() => { onOpenDelete(project); setOpen(false) }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-600 text-red-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Löschen
          </button>
        </div>
      )}
    </div>
  )
}

const statusConfig = {
  running: { bg: 'bg-green-500/10', text: 'text-green-400', dot: 'bg-green-400' },
  deploying: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  error: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
}

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || { bg: 'bg-gray-500/10', text: 'text-gray-400', dot: 'bg-gray-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${status === 'deploying' ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  )
}

export default function ProjectCard({ project, isDeploying, onDeploy, onDeployClose, onOpenPerf, onOpenDelete, viewMode = 'list' }) {
  // Grid-Ansicht: Kompakte Bento-Karte
  if (viewMode === 'grid') {
    return (
      <div className={`bento-card p-4 flex flex-col ${
        isDeploying ? 'ring-1 ring-yellow-400/30 shadow-lg shadow-yellow-400/5' : ''
      }`}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <Link href={`/edit/${project.id}`} className="text-base font-semibold truncate flex-1 hover:text-blue-400 transition-colors">
            {project.name}
          </Link>
          <StatusBadge status={project.status} />
        </div>

        <a href={`https://${project.domain}`} target="_blank" rel="noopener"
           className="text-gray-400 text-xs truncate mb-3 hover:text-gray-300 transition-colors block">
          {project.domain}
        </a>

        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <span className="text-xs bg-gray-700/50 text-gray-300 px-2 py-0.5 rounded-full">{project.type}</span>
          {project.groupName && (
            <span className="text-xs bg-gray-700/50 text-gray-400 px-2 py-0.5 rounded-full truncate max-w-[120px]"
                  title={`Gruppe: ${project.groupName}`}>{project.groupName}</span>
          )}
          {project.webhookConfigured && (
            <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full" title="Auto-Deploy">Auto</span>
          )}
          <PerformanceBadge score={project.performanceScore} />
          <WebCheckBadge score={project.performanceScore} />
        </div>

        {project.lastDeploy && (
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-auto mb-3">
            <span className={project.lastDeploy.success ? 'text-green-400' : 'text-red-400'}>●</span>
            <span>{formatTimeAgo(project.lastDeploy.at)}</span>
            <TriggerBadge trigger={project.lastDeploy.trigger} />
          </div>
        )}

        <div className="flex items-center gap-1 pt-3 border-t border-gray-700/50 mt-auto">
          <a href={`https://${project.domain}`} target="_blank" rel="noopener"
             className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" title="Öffnen">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <Link href={`/edit/${project.id}`}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" title="Bearbeiten">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Link>
          <button onClick={() => onDeploy(project.id)} disabled={isDeploying}
                  className="p-2 rounded-lg text-green-400 hover:bg-green-600/10 disabled:text-green-800 transition-colors" title="Deploy">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
          </button>
          {project.performanceCheckEnabled !== false && (
            <button onClick={() => onOpenPerf(project)}
                    className="p-2 rounded-lg text-indigo-400 hover:bg-indigo-600/10 transition-colors" title="Performance">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
          )}
          <div className="ml-auto">
            <MoreDropdown project={project} onOpenDelete={onOpenDelete} />
          </div>
        </div>

        {isDeploying && (
          <div className="mt-3">
            <DeployLog projectId={project.id} onClose={() => onDeployClose(project.id)} showEstimates showTrigger />
          </div>
        )}
      </div>
    )
  }

  // Listen-Ansicht: Horizontale Bento-Karte
  return (
    <div className={`bento-card p-4 sm:p-5 ${
      isDeploying ? 'ring-1 ring-yellow-400/30 shadow-lg shadow-yellow-400/5' : ''
    }`}>
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap mb-1">
            <Link href={`/edit/${project.id}`} className="text-lg font-semibold hover:text-blue-400 transition-colors">
              {project.name}
            </Link>
            <StatusBadge status={project.status} />
            {project.webhookConfigured && (
              <span className="inline-flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full" title="Auto-Deploy via Webhook aktiv">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Auto
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mb-2">
            {project.domain} · {project.type} · {project.repo}
            {project.groupName && <span className="text-gray-500"> · {project.groupName}</span>}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <PerformanceBadge score={project.performanceScore} />
            <WebCheckBadge score={project.performanceScore} />
            {project.lastDeploy && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className={project.lastDeploy.success ? 'text-green-400' : 'text-red-400'}>●</span>
                <span>{formatTimeAgo(project.lastDeploy.at)}</span>
                {project.lastDeploy.durationMs && <span>{(project.lastDeploy.durationMs / 1000).toFixed(1)}s</span>}
                <TriggerBadge trigger={project.lastDeploy.trigger} />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:flex-shrink-0">
          <a href={`https://${project.domain}`} target="_blank" rel="noopener"
             className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" title="Öffnen">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <Link href={`/edit/${project.id}`}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" title="Bearbeiten">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Link>
          <button onClick={() => onDeploy(project.id)} disabled={isDeploying}
                  className="px-3 py-2 rounded-lg bg-green-600/10 text-green-400 hover:bg-green-600/20 disabled:opacity-40 text-sm font-medium transition-colors">
            {isDeploying ? 'Läuft...' : 'Deploy'}
          </button>
          {project.performanceCheckEnabled !== false && (
            <button onClick={() => onOpenPerf(project)}
                    className="p-2 rounded-lg text-indigo-400 hover:bg-indigo-600/10 transition-colors" title="Performance">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
          )}
          <MoreDropdown project={project} onOpenDelete={onOpenDelete} />
        </div>
      </div>

      {isDeploying && (
        <div className="mt-3">
          <DeployLog projectId={project.id} onClose={() => onDeployClose(project.id)} showEstimates showTrigger />
        </div>
      )}
    </div>
  )
}
