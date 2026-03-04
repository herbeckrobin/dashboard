// Gruppen-Detail und Bearbeitung

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import CollapsibleSection from '../../components/CollapsibleSection'
import UsageBar from '../../components/UsageBar'
import ProjectCard from '../../components/ProjectCard'
import PerformanceModal from '../../components/PerformanceModal'
import DeleteModal from '../../components/DeleteModal'
import useLocalStorage from '../../hooks/useLocalStorage'
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs'
import { ProjectCardSkeleton, ProjectListSkeleton } from '../../components/Skeleton'

const packageColors = {
  starter: 'bg-blue-600/20 text-blue-400',
  business: 'bg-purple-600/20 text-purple-400',
  unbegrenzt: 'bg-green-600/20 text-green-400',
}

const packageLabels = {
  starter: 'Starter',
  business: 'Business',
  unbegrenzt: 'Unbegrenzt',
}

export default function GroupDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const [group, setGroup] = useState(null)
  const [projects, setProjects] = useState([])
  const [usage, setUsage] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [viewMode, setViewMode] = useLocalStorage('group-projects-view', 'grid')
  const [activeDeployIds, setActiveDeployIds] = useState(new Set())
  const [closedDeployIds, setClosedDeployIds] = useState(new Set())
  const [perfModal, setPerfModal] = useState(null)
  const [projectDeleteModal, setProjectDeleteModal] = useState(null)

  useBreadcrumbs([
    { label: 'Gruppen', href: '/groups' },
    { label: group?.name || 'Laden...' }
  ])

  useEffect(() => {
    if (!id) return
    loadGroup()
    loadUsage()
  }, [id])

  async function loadGroup() {
    const res = await fetch(`/api/groups/${id}`)
    if (res.ok) {
      const data = await res.json()
      setGroup(data.group)
      setProjects(data.projects)
      setForm({
        name: data.group.name,
        limits: { ...data.group.limits },
        extraStorage: data.group.extraStorage || 0,
        notes: data.group.notes || ''
      })
    }
  }

  async function loadUsage() {
    const res = await fetch(`/api/groups/${id}/usage`)
    if (res.ok) {
      const data = await res.json()
      setUsage(data.usage)
    }
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/groups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    if (res.ok) {
      const data = await res.json()
      setGroup(data.group)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/groups')
    }
    setDeleting(false)
  }

  // Deploy-Handling (gleich wie Dashboard)
  const handleDeploy = async (projectId) => {
    setActiveDeployIds(prev => new Set([...prev, projectId]))
    setClosedDeployIds(prev => { const n = new Set(prev); n.delete(projectId); return n })
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: 'deploying' } : p))
    const res = await fetch(`/api/projects/${projectId}/deploy`, { method: 'POST' })
    const data = await res.json()
    if (!data.success) {
      alert('Fehler: ' + (data.error || 'Deploy konnte nicht gestartet werden'))
      setActiveDeployIds(prev => { const n = new Set(prev); n.delete(projectId); return n })
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: 'running' } : p))
    }
  }

  const handleDeployClose = (projectId) => {
    setActiveDeployIds(prev => { const n = new Set(prev); n.delete(projectId); return n })
    setClosedDeployIds(prev => new Set([...prev, projectId]))
    loadGroup()
  }

  const handleProjectDeleteConfirm = (projectId) => {
    setProjects(prev => prev.filter(p => p.id !== projectId))
    setProjectDeleteModal(null)
  }

  const isDeploying = (projectId) => activeDeployIds.has(projectId) && !closedDeployIds.has(projectId)

  if (!group || !form) {
    return (
      <div className="animate-pulse space-y-4 max-w-4xl">
          <div className="h-8 w-64 bg-gray-700/50 rounded" />
          <div className="h-40 bg-gray-800 rounded-xl" />
          <div className="h-40 bg-gray-800 rounded-xl" />
        </div>
    )
  }

  const isUnlimited = group.limits.projects === -1
  const storageUsedGb = usage ? (usage.storage.usedBytes / (1024 * 1024 * 1024)).toFixed(1) : '...'
  const effectiveStorage = isUnlimited ? -1 : (form.limits.storage + form.extraStorage)

  return (
    <>
      <div className="max-w-4xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{group.name}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${packageColors[group.package]}`}>
              {packageLabels[group.package]}
            </span>
          </div>
        </div>

        {/* Nutzung & Limits */}
        <CollapsibleSection title="Nutzung & Limits">
          <div className="space-y-3">
            <UsageBar
              label="Projekte"
              used={usage?.projects.used ?? projects.length}
              limit={group.limits.projects}
              unit=""
              unlimited={isUnlimited}
            />
            <UsageBar
              label="Speicher"
              used={storageUsedGb}
              limit={effectiveStorage}
              unit="GB"
              unlimited={isUnlimited}
            />
            <UsageBar
              label="Domains"
              used={usage?.domains.used ?? projects.length}
              limit={group.limits.domains}
              unit=""
              unlimited={isUnlimited}
            />

            {/* E-Mail Info */}
            <div className="flex justify-between text-sm pt-2 border-t border-gray-700/50">
              <span className="text-gray-400">E-Mail-Postfächer</span>
              <span className="text-gray-300">
                {isUnlimited ? 'Unbegrenzt' : `${group.limits.email.count} Postfächer à ${group.limits.email.sizeGb} GB`}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Support</span>
              <span className="text-gray-300">
                {group.limits.support.type === 'email+phone' ? 'E-Mail + Telefon' : 'E-Mail'} ({group.limits.support.responseHours}h)
              </span>
            </div>
          </div>
        </CollapsibleSection>

        {/* Gruppen-Einstellungen */}
        <CollapsibleSection title="Einstellungen">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Gruppenname</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                     className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors" />
            </div>

            {!isUnlimited && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Projekte</label>
                  <input type="number" min="1" value={form.limits.projects}
                         onChange={e => setForm({ ...form, limits: { ...form.limits, projects: parseInt(e.target.value) || 1 } })}
                         className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Speicher (GB)</label>
                  <input type="number" min="1" value={form.limits.storage}
                         onChange={e => setForm({ ...form, limits: { ...form.limits, storage: parseInt(e.target.value) || 1 } })}
                         className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Domains</label>
                  <input type="number" min="1" value={form.limits.domains}
                         onChange={e => setForm({ ...form, limits: { ...form.limits, domains: parseInt(e.target.value) || 1 } })}
                         className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
            )}

            {!isUnlimited && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Extra-Speicher (+2 €/5 GB pro Monat)</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="0" max="100" step="5" value={form.extraStorage}
                         onChange={e => setForm({ ...form, extraStorage: parseInt(e.target.value) })}
                         className="flex-1 accent-blue-500" />
                  <span className="text-sm font-medium w-16 text-right">
                    {form.extraStorage > 0 ? `+${form.extraStorage} GB` : '0'}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-400 mb-1">Notizen</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                        rows={2} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handleSave} disabled={saving}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors">
                {saving ? 'Speichert...' : 'Speichern'}
              </button>
              {saved && <span className="text-green-400 text-sm">Gespeichert</span>}
            </div>
          </div>
        </CollapsibleSection>

        {/* Projekte */}
        <CollapsibleSection title={`Projekte (${projects.length})`}
          headerRight={projects.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-gray-700/50 rounded-lg p-0.5">
                <button onClick={() => setViewMode('grid')}
                  className={`p-1 rounded transition-colors ${viewMode === 'grid' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button onClick={() => setViewMode('list')}
                  className={`p-1 rounded transition-colors ${viewMode === 'list' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
              <Link href={`/new?groupId=${id}`}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-lg text-xs font-medium transition-colors">
                + Projekt
              </Link>
            </div>
          )}>
          {projects.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500 text-sm mb-3">Noch keine Projekte in dieser Gruppe</p>
              <Link href={`/new?groupId=${id}`}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors inline-block">
                Projekt hinzufügen
              </Link>
            </div>
          ) : (
            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 gap-4'
              : 'space-y-3'
            }>
              {projects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  viewMode={viewMode}
                  isDeploying={isDeploying(project.id)}
                  onDeploy={handleDeploy}
                  onDeployClose={handleDeployClose}
                  onOpenPerf={setPerfModal}
                  onOpenDelete={setProjectDeleteModal}
                />
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Aktionen */}
        <CollapsibleSection title="Aktionen" defaultOpen={false}>
          <div>
            <p className="text-sm text-gray-400 mb-3">
              Beim Löschen der Gruppe werden die Projekte nicht gelöscht, sondern nur aus der Gruppe entfernt.
            </p>
            {!deleteConfirm ? (
              <button onClick={() => setDeleteConfirm(true)}
                      className="px-4 py-2 rounded-lg text-sm text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors">
                Gruppe löschen
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={handleDelete} disabled={deleting}
                        className="px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors">
                  {deleting ? 'Löscht...' : 'Wirklich löschen'}
                </button>
                <button onClick={() => setDeleteConfirm(false)}
                        className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-700 transition-colors">
                  Abbrechen
                </button>
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>

      {perfModal && (
        <PerformanceModal project={perfModal} onClose={() => setPerfModal(null)} />
      )}
      {projectDeleteModal && (
        <DeleteModal project={projectDeleteModal} onConfirm={handleProjectDeleteConfirm} onClose={() => setProjectDeleteModal(null)} />
      )}
    </>
  )
}
