// App-Layout mit Sidebar-Navigation, Top-Bar und Breadcrumbs

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useExtraBreadcrumbs } from '../hooks/useBreadcrumbs'
import TopLoadingBar from './TopLoadingBar'
import GlobalSearch from './GlobalSearch'

// SVG Icons
const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

const GroupsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)

const EmailIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
)

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { href: '/groups', label: 'Gruppen', icon: <GroupsIcon /> },
  { href: '/email', label: 'E-Mail', icon: <EmailIcon /> },
  { href: '/new', label: 'Neues Projekt', icon: <PlusIcon /> },
  { href: '/settings', label: 'Einstellungen', icon: <SettingsIcon /> },
]

function getBreadcrumbs(router, extra) {
  const path = router.pathname
  const crumbs = [{ label: 'Dashboard', href: '/' }]

  if (path === '/settings') {
    crumbs.push({ label: 'Einstellungen' })
  } else if (path === '/new') {
    crumbs.push({ label: 'Neues Projekt' })
  } else if (path === '/groups') {
    crumbs.push({ label: 'Gruppen' })
  } else if (path === '/groups/new') {
    crumbs.push({ label: 'Gruppen', href: '/groups' })
    crumbs.push({ label: 'Neue Gruppe' })
  } else if (path.startsWith('/groups/')) {
    if (extra.length > 0) {
      extra.forEach(c => crumbs.push(c))
    } else {
      crumbs.push({ label: 'Gruppen', href: '/groups' })
      crumbs.push({ label: 'Gruppe' })
    }
  } else if (path === '/email') {
    crumbs.push({ label: 'E-Mail' })
  } else if (path.startsWith('/email/setup/')) {
    crumbs.push({ label: 'E-Mail', href: '/email' })
    crumbs.push({ label: 'Einrichtung' })
  } else if (path.startsWith('/email/')) {
    if (extra.length > 0) {
      extra.forEach(c => crumbs.push(c))
    } else {
      crumbs.push({ label: 'E-Mail', href: '/email' })
      crumbs.push({ label: 'Domain' })
    }
  } else if (path.startsWith('/edit/')) {
    // Extra-Breadcrumbs enthalten den Projektnamen
    if (extra.length > 0) {
      extra.forEach(c => crumbs.push(c))
    } else {
      crumbs.push({ label: 'Bearbeiten' })
    }
  }

  return crumbs
}

export default function Layout({ children, onLogout }) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const extra = useExtraBreadcrumbs()
  const breadcrumbs = getBreadcrumbs(router, extra)

  // Sidebar schliessen bei Navigation
  useEffect(() => {
    setSidebarOpen(false)
  }, [router.asPath])

  const isActive = (href) => {
    if (href === '/') return router.pathname === '/'
    return router.pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen flex">
      <TopLoadingBar />
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full z-50 bg-gray-800 border-r border-gray-700
        flex flex-col transition-all duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static
        ${sidebarExpanded ? 'w-56' : 'w-16'}
      `}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        {/* Brand */}
        <div className="h-14 flex items-center border-b border-gray-700 px-4 flex-shrink-0">
          {sidebarExpanded ? (
            <span className="text-sm font-bold whitespace-nowrap overflow-hidden">Deploy Dashboard</span>
          ) : (
            <span className="text-lg font-bold w-8 text-center">D</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3">
          {NAV_ITEMS.map(item => (
            <Link key={item.href} href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors mb-1
                ${isActive(item.href)
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }
              `}>
              <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                {item.icon}
              </span>
              {sidebarExpanded && (
                <span className="text-sm whitespace-nowrap overflow-hidden">{item.label}</span>
              )}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-700 p-2 flex-shrink-0">
          <button onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 mx-0 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors w-full">
            <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
              <LogoutIcon />
            </span>
            {sidebarExpanded && (
              <span className="text-sm whitespace-nowrap overflow-hidden">Abmelden</span>
            )}
          </button>
        </div>
      </aside>

      {/* Hauptbereich */}
      <div className="flex-1 min-w-0">
        {/* Top-Bar */}
        <header className="h-14 flex items-center gap-4 px-4 md:px-8 border-b border-gray-700/50 flex-shrink-0">
          {/* Hamburger (Mobile) */}
          <button onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-sm text-gray-400 min-w-0">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-2 min-w-0">
                {i > 0 && <span className="text-gray-600 flex-shrink-0">/</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-white transition-colors truncate">{crumb.label}</Link>
                ) : (
                  <span className="text-gray-200 truncate">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>

          {/* Globale Suche */}
          <div className="ml-auto">
            <GlobalSearch />
          </div>
        </header>

        {/* Seiteninhalt */}
        <main className="p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
