// Globale Spotlight-Suche: Cmd+K Modal mit Live-Ergebnissen

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'

// Schnellaktionen (immer verfügbar, clientseitig gefiltert)
const QUICK_ACTIONS = [
  { id: 'new-project', label: 'Neues Projekt', href: '/new', icon: 'plus' },
  { id: 'new-group', label: 'Neue Gruppe', href: '/groups/new', icon: 'plus' },
  { id: 'email', label: 'E-Mail', href: '/email', icon: 'email' },
  { id: 'settings', label: 'Einstellungen', href: '/settings', icon: 'settings' },
  { id: 'groups', label: 'Gruppen', href: '/groups', icon: 'groups' },
  { id: 'dashboard', label: 'Dashboard', href: '/', icon: 'dashboard' },
]

// Status-Farben fuer Projekte
const STATUS_COLORS = {
  running: 'bg-green-500',
  deploying: 'bg-yellow-500',
  error: 'bg-red-500',
  pending: 'bg-gray-500',
}

// Framework-Labels
const FRAMEWORK_LABELS = {
  wordpress: 'WordPress',
  redaxo: 'Redaxo',
  laravel: 'Laravel',
  typo3: 'TYPO3',
  contao: 'Contao',
  'nextjs-starter': 'Next.js',
  'express-starter': 'Express',
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function ActionIcon({ type }) {
  if (type === 'plus') return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
  if (type === 'settings') return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
  if (type === 'groups') return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
  if (type === 'email') return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
  // dashboard
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  )
}

export default function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ projects: [], groups: [] })
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  // Alle angezeigten Einträge als flache Liste (für Keyboard-Navigation)
  const allItems = buildItemList(query, results)

  // Cmd+K / Ctrl+K zum Öffnen
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Fokus auf Input wenn Modal öffnet
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setResults({ projects: [], groups: [] })
      setActiveIndex(0)
    }
  }, [open])

  // Bei Route-Wechsel Modal schliessen
  useEffect(() => {
    setOpen(false)
  }, [router.asPath])

  // Debounced Suche
  const search = useCallback((q) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) {
      setResults({ projects: [], groups: [] })
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(data => {
          setResults(data)
          setActiveIndex(0)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }, 200)
  }, [])

  const handleInput = (e) => {
    const val = e.target.value
    setQuery(val)
    search(val)
  }

  // Keyboard-Navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, allItems.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter' && allItems[activeIndex]) {
      e.preventDefault()
      router.push(allItems[activeIndex].href)
      setOpen(false)
    }
  }

  if (!open) {
    // Trigger-Button in der Top-Bar
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors text-sm"
      >
        <SearchIcon />
        <span className="hidden sm:inline">Suche</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-700 text-[10px] font-mono text-gray-400 ml-2">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </button>
    )
  }

  return (
    <>
      {/* Trigger-Button (aktiv/offen) */}
      <button
        onClick={() => setOpen(false)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-700 border border-gray-600 text-gray-200 transition-colors text-sm"
      >
        <SearchIcon />
        <span className="hidden sm:inline">Suche</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-600 text-[10px] font-mono text-gray-300 ml-2">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </button>

      {/* Modal Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setOpen(false)} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
        <div
          className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Suchfeld */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
            <SearchIcon />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Projekt, Gruppe oder Aktion suchen..."
              className="flex-1 bg-transparent outline-none text-sm text-gray-100 placeholder-gray-500"
              autoComplete="off"
              spellCheck={false}
            />
            {loading && (
              <div className="w-4 h-4 border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin" />
            )}
            <kbd className="px-1.5 py-0.5 rounded bg-gray-700 text-[10px] font-mono text-gray-400">ESC</kbd>
          </div>

          {/* Ergebnisliste */}
          <div className="max-h-80 overflow-y-auto">
            {allItems.length === 0 && query.trim() && !loading && (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                Keine Ergebnisse
              </div>
            )}

            {renderSection(allItems, 'project', 'Projekte', activeIndex, setActiveIndex, router, setOpen)}
            {renderSection(allItems, 'group', 'Gruppen', activeIndex, setActiveIndex, router, setOpen)}
            {renderSection(allItems, 'email', 'E-Mail', activeIndex, setActiveIndex, router, setOpen)}
            {renderSection(allItems, 'action', 'Aktionen', activeIndex, setActiveIndex, router, setOpen)}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-700 flex items-center gap-4 text-[11px] text-gray-500">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-gray-700 text-[10px]">&uarr;&darr;</kbd> Navigation
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-gray-700 text-[10px]">&#9166;</kbd> Öffnen
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-gray-700 text-[10px]">ESC</kbd> Schließen
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

// Alle Items als flache Liste mit globalem Index aufbauen
function buildItemList(query, results) {
  const items = []
  const q = query.trim().toLowerCase()

  // Projekte
  results.projects?.forEach(p => {
    items.push({
      type: 'project',
      id: p.id,
      label: p.name,
      detail: p.domain || p.framework,
      status: p.status,
      framework: p.framework,
      href: `/edit/${p.id}`,
    })
  })

  // Gruppen
  results.groups?.forEach(g => {
    items.push({
      type: 'group',
      id: g.id,
      label: g.name,
      detail: g.package ? (g.package.charAt(0).toUpperCase() + g.package.slice(1)) : '',
      extra: g.projectCount !== undefined ? `${g.projectCount} Projekte` : '',
      href: `/groups/${g.id}`,
    })
  })

  // E-Mail-Konten
  results.emailAccounts?.forEach(a => {
    items.push({
      type: 'email',
      id: a.id,
      label: a.email,
      detail: a.displayName || a.domain,
      href: `/email/${a.domain}`,
    })
  })

  // E-Mail-Domains
  results.emailDomains?.forEach(d => {
    items.push({
      type: 'email',
      id: `domain-${d.domain}`,
      label: d.domain,
      detail: `${d.accountCount} Postfaecher`,
      href: `/email/${d.domain}`,
    })
  })

  // Schnellaktionen (immer anzeigen wenn leer, oder filtern)
  const actions = q
    ? QUICK_ACTIONS.filter(a => a.label.toLowerCase().includes(q))
    : QUICK_ACTIONS

  // Aktionen nur zeigen wenn: kein Query (Startansicht) oder gefiltert
  if (!q || actions.length > 0) {
    actions.forEach(a => {
      items.push({
        type: 'action',
        id: a.id,
        label: a.label,
        icon: a.icon,
        href: a.href,
      })
    })
  }

  return items
}

// Section rendern (nur wenn Items vorhanden)
function renderSection(allItems, type, title, activeIndex, setActiveIndex, router, setOpen) {
  const sectionItems = allItems.filter(i => i.type === type)
  if (sectionItems.length === 0) return null

  return (
    <div className="py-1">
      <div className="px-4 py-1.5 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
        {title}
      </div>
      {sectionItems.map(item => {
        const globalIdx = allItems.indexOf(item)
        const isActive = globalIdx === activeIndex

        return (
          <button
            key={`${item.type}-${item.id}`}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
              isActive ? 'bg-blue-600/20 text-white' : 'text-gray-300 hover:bg-gray-700/50'
            }`}
            onMouseEnter={() => setActiveIndex(globalIdx)}
            onClick={() => { router.push(item.href); setOpen(false) }}
          >
            {/* Icon */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isActive ? 'bg-blue-600/30 text-blue-400' : 'bg-gray-700 text-gray-400'
            }`}>
              {item.type === 'project' && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              )}
              {item.type === 'group' && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
              {item.type === 'email' && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
              {item.type === 'action' && <ActionIcon type={item.icon} />}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{item.label}</div>
              {(item.detail || item.extra) && (
                <div className="text-xs text-gray-500 truncate">
                  {[item.detail, item.extra].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>

            {/* Status-Dot (Projekte) */}
            {item.status && (
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[item.status] || 'bg-gray-500'}`} />
            )}

            {/* Framework-Badge (Projekte) */}
            {item.framework && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 flex-shrink-0">
                {FRAMEWORK_LABELS[item.framework] || item.framework}
              </span>
            )}

            {/* Pfeil */}
            <svg className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-gray-300' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )
      })}
    </div>
  )
}
