// Dashboard Hauptseite: Bento-Layout mit Projekten, System-Info, Deploys

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatTimeAgo } from '../lib/format'
import { TriggerBadge } from '../components/DeployLog'
import SystemCard from '../components/SystemCard'
import BackupCard from '../components/BackupCard'
import ProjectCard from '../components/ProjectCard'
import PerformanceModal from '../components/PerformanceModal'
import DeleteModal from '../components/DeleteModal'
import useLocalStorage from '../hooks/useLocalStorage'
import { ProjectCardSkeleton, ProjectListSkeleton, InfoCardSkeleton, DeployListSkeleton } from '../components/Skeleton'

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [groups, setGroups] = useState([])
  const [recentDeploys, setRecentDeploys] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeDeployIds, setActiveDeployIds] = useState(new Set())
  const [closedDeployIds, setClosedDeployIds] = useState(new Set())
  const [systemInfo, setSystemInfo] = useState(null)
  const [backupInfo, setBackupInfo] = useState(null)
  const [perfModal, setPerfModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [viewMode, setViewMode] = useLocalStorage('dashboard-view', 'grid')
  const [groupFilter, setGroupFilter] = useLocalStorage('dashboard-group-filter', '')

  // Initial laden
  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/deploy-history?limit=5').then(r => r.json()),
    ]).then(([projectData, historyData]) => {
      const prjs = projectData.projects || []
      setProjects(prjs)
      setRecentDeploys(historyData.deploys || [])
      const deploying = new Set(prjs.filter(p => p.status === 'deploying').map(p => p.id))
      setActiveDeployIds(deploying)
      setLoading(false)
    })
    fetch('/api/groups').then(r => r.json()).then(d => setGroups(d.groups || [])).catch(() => {})
    fetch('/api/system-info').then(r => r.json()).then(setSystemInfo).catch(() => {})
    fetch('/api/backup-info').then(r => r.json()).then(setBackupInfo).catch(() => {})
  }, [])

  // System & Backup Polling (30s)
  useEffect(() => {
    const poll = setInterval(() => {
      fetch('/api/system-info').then(r => r.json()).then(setSystemInfo).catch(() => {})
      fetch('/api/backup-info').then(r => r.json()).then(setBackupInfo).catch(() => {})
    }, 30000)
    return () => clearInterval(poll)
  }, [])

  // Auto-Polling alle 3s
  useEffect(() => {
    const poll = setInterval(() => {
      Promise.all([
        fetch('/api/projects').then(r => r.json()),
        fetch('/api/deploy-history?limit=5').then(r => r.json()),
      ]).then(([projectData, historyData]) => {
        const prjs = projectData.projects || []
        setProjects(prjs)
        setRecentDeploys(historyData.deploys || [])
        setActiveDeployIds(prev => {
          const deploying = new Set(prjs.filter(p => p.status === 'deploying').map(p => p.id))
          const merged = new Set([...prev])
          for (const id of deploying) {
            if (!prev.has(id)) {
              setClosedDeployIds(c => { const n = new Set(c); n.delete(id); return n })
            }
            merged.add(id)
          }
          for (const id of merged) {
            if (!deploying.has(id) && !prev.has(id)) merged.delete(id)
          }
          return merged
        })
      }).catch(() => {})
    }, 3000)
    return () => clearInterval(poll)
  }, [])

  // Optimistic Deploy: sofort UI updaten
  const handleDeploy = async (id) => {
    setActiveDeployIds(prev => new Set([...prev, id]))
    setClosedDeployIds(prev => { const n = new Set(prev); n.delete(id); return n })
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'deploying' } : p))
    const res = await fetch(`/api/projects/${id}/deploy`, { method: 'POST' })
    const data = await res.json()
    if (!data.success) {
      alert('Fehler: ' + (data.error || 'Deploy konnte nicht gestartet werden'))
      setActiveDeployIds(prev => { const n = new Set(prev); n.delete(id); return n })
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'running' } : p))
    }
  }

  const handleDeployClose = (id) => {
    setActiveDeployIds(prev => { const n = new Set(prev); n.delete(id); return n })
    setClosedDeployIds(prev => new Set([...prev, id]))
    Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/deploy-history?limit=5').then(r => r.json()),
    ]).then(([projectData, historyData]) => {
      setProjects(projectData.projects || [])
      setRecentDeploys(historyData.deploys || [])
    })
  }

  // Optimistic Delete: sofort aus Liste entfernen
  const handleDeleteConfirm = (id) => {
    setProjects(prev => prev.filter(p => p.id !== id))
    setDeleteModal(null)
  }

  const isDeploying = (id) => activeDeployIds.has(id) && !closedDeployIds.has(id)

  const filteredProjects = projects.filter(p => {
    if (!groupFilter) return true
    if (groupFilter === 'ungrouped') return !p.groupId
    return p.groupId === groupFilter
  })

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Projekte</h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* Gruppen-Filter */}
          {groups.length > 0 && (
            <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700/50 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500">
              <option value="">Alle Projekte</option>
              <option value="ungrouped">Ohne Gruppe</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
          {/* Grid/List Toggle */}
          <div className="flex items-center bg-gray-800 rounded-lg p-1 border border-gray-700/50">
            <button onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
              title="Grid-Ansicht">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
              title="Listen-Ansicht">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          <Link href="/new" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors">
            + Neues Projekt
          </Link>
        </div>
      </div>

      {/* Bento Grid: Projekte links, Info-Sidebar rechts */}
      <div className="flex flex-col xl:flex-row gap-4">
        {/* Hauptbereich: Projekte */}
        <div className="flex-1 min-w-0">
          {loading ? (
            // Skeleton Loading
            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-4'
            }>
              {viewMode === 'grid'
                ? [1, 2, 3, 4, 5, 6].map(i => <ProjectCardSkeleton key={i} />)
                : [1, 2, 3].map(i => <ProjectListSkeleton key={i} />)
              }
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="bento-card p-8 sm:p-12 text-center">
              <div className="text-gray-500 mb-2">
                <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-gray-400 mb-4">Noch keine Projekte vorhanden</p>
              <Link href="/new" className="text-blue-400 hover:text-blue-300 font-medium">Erstes Projekt anlegen →</Link>
            </div>
          ) : (
            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-3'
            }>
              {filteredProjects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  viewMode={viewMode}
                  isDeploying={isDeploying(project.id)}
                  onDeploy={handleDeploy}
                  onDeployClose={handleDeployClose}
                  onOpenPerf={setPerfModal}
                  onOpenDelete={setDeleteModal}
                />
              ))}
            </div>
          )}
        </div>

        {/* Info-Sidebar: System, Backup, Deploys */}
        <div className="xl:w-80 flex-shrink-0 space-y-4">
          {/* System Info */}
          {!systemInfo ? <InfoCardSkeleton /> : <SystemCard data={systemInfo} />}

          {/* Backup Info */}
          {!backupInfo ? <InfoCardSkeleton /> : <BackupCard data={backupInfo} />}

          {/* Letzte Deploys */}
          {loading ? <DeployListSkeleton /> : recentDeploys.length > 0 && (
            <div className="bento-card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700/50">
                <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Letzte Deploys</h2>
              </div>
              <div className="divide-y divide-gray-700/50">
                {recentDeploys.map(deploy => (
                  <div key={deploy.id} className="px-4 py-2.5 flex items-center gap-2 text-sm hover:bg-gray-700/20 transition-colors">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${deploy.success ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className="font-medium truncate flex-1">{deploy.projectName}</span>
                    <TriggerBadge trigger={deploy.trigger} />
                    <span className="text-gray-500 text-xs flex-shrink-0">{formatTimeAgo(deploy.finishedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {perfModal && (
        <PerformanceModal project={perfModal} onClose={() => setPerfModal(null)} />
      )}
      {deleteModal && (
        <DeleteModal project={deleteModal} onConfirm={handleDeleteConfirm} onClose={() => setDeleteModal(null)} />
      )}
    </>
  )
}
