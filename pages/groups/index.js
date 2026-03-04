// Gruppen-Uebersicht (Kunden-Gruppen mit Hosting-Paketen)

import { useState, useEffect } from 'react'
import Link from 'next/link'
import GroupCard from '../../components/GroupCard'
import { GroupCardSkeleton } from '../../components/Skeleton'

export default function GroupsPage() {
  const [groups, setGroups] = useState(null)
  const [usageMap, setUsageMap] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function loadGroups() {
    const res = await fetch('/api/groups')
    if (res.ok) {
      const data = await res.json()
      setGroups(data.groups)
      // Usage fuer jede Gruppe laden
      data.groups.forEach(async (g) => {
        const uRes = await fetch(`/api/groups/${g.id}/usage`)
        if (uRes.ok) {
          const uData = await uRes.json()
          setUsageMap(prev => ({ ...prev, [g.id]: uData.usage }))
        }
      })
    }
  }

  useEffect(() => { loadGroups() }, [])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await fetch(`/api/groups/${deleteTarget.id}`, { method: 'DELETE' })
    if (res.ok) {
      setGroups(prev => prev.filter(g => g.id !== deleteTarget.id))
    }
    setDeleting(false)
    setDeleteTarget(null)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gruppen</h1>
        <Link href="/groups/new"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors">
          + Neue Gruppe
        </Link>
      </div>

      {groups === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <GroupCardSkeleton key={i} />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="bento-card p-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-gray-400 mb-4">Noch keine Gruppen vorhanden</p>
          <Link href="/groups/new"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors inline-block">
            Erste Gruppe erstellen
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map(g => (
            <GroupCard
              key={g.id}
              group={g}
              usage={usageMap[g.id]}
              onDelete={() => setDeleteTarget(g)}
            />
          ))}
        </div>
      )}

      {/* Loesch-Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Gruppe löschen?</h3>
            <p className="text-gray-400 text-sm mb-4">
              Die Gruppe <strong>"{deleteTarget.name}"</strong> wird gelöscht.
              Zugehörige Projekte werden nicht gelöscht, sondern nur aus der Gruppe entfernt.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)}
                      className="px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors">
                Abbrechen
              </button>
              <button onClick={handleDelete} disabled={deleting}
                      className="px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deleting ? 'Löscht...' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
