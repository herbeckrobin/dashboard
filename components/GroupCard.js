// Gruppen-Karte fuer die Gruppen-Uebersicht (Bento-Style)

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import UsageBar from './UsageBar'

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

function MoreDropdown({ onDelete }) {
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
          <button onClick={() => { onDelete(); setOpen(false) }}
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

export default function GroupCard({ group, usage, onDelete }) {
  const isUnlimited = group.limits.projects === -1
  const storageLimit = group.limits.storage === -1 ? -1 : group.limits.storage + (group.extraStorage || 0)
  const storageUsedGb = usage ? (usage.storage.usedBytes / (1024 * 1024 * 1024)).toFixed(1) : '...'

  return (
    <div className="bento-card p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-3">
        <Link href={`/groups/${group.id}`} className="text-base font-semibold truncate flex-1 hover:text-blue-400 transition-colors">
          {group.name}
        </Link>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${packageColors[group.package] || 'bg-gray-600/20 text-gray-400'}`}>
          {packageLabels[group.package] || group.package}
        </span>
      </div>

      <div className="text-xs text-gray-500 mb-3">
        {group.projectCount ?? 0} Projekt{(group.projectCount ?? 0) !== 1 ? 'e' : ''}
      </div>

      <div className="space-y-2 mb-3 flex-1">
        <UsageBar
          label="Projekte"
          used={group.projectCount ?? 0}
          limit={group.limits.projects}
          unit=""
          unlimited={isUnlimited}
        />
        <UsageBar
          label="Speicher"
          used={storageUsedGb}
          limit={storageLimit}
          unit="GB"
          unlimited={group.limits.storage === -1}
        />
      </div>

      {group.notes && (
        <p className="text-xs text-gray-500 truncate mb-3" title={group.notes}>{group.notes}</p>
      )}

      <div className="flex items-center gap-1 pt-3 border-t border-gray-700/50 mt-auto">
        <Link href={`/groups/${group.id}`}
              className="px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors">
          Details
        </Link>
        <Link href={`/new?groupId=${group.id}`}
              className="px-3 py-1.5 rounded-lg text-sm text-green-400 hover:bg-green-600/10 transition-colors">
          + Projekt
        </Link>
        <div className="ml-auto">
          <MoreDropdown onDelete={onDelete} />
        </div>
      </div>
    </div>
  )
}
