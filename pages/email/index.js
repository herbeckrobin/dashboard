// E-Mail Uebersicht — Alle Domains mit E-Mail-Status

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import DomainCard from '../../components/email/DomainCard'

export default function EmailOverviewPage() {
  const router = useRouter()
  const [domains, setDomains] = useState([])
  const [dnsStatuses, setDnsStatuses] = useState({})
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [projects, setProjects] = useState([])
  const [newDomain, setNewDomain] = useState('')
  const [newGroupId, setNewGroupId] = useState('')
  const [groups, setGroups] = useState([])
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDomains()
  }, [])

  const fetchDomains = async () => {
    try {
      const res = await fetch('/api/email/domains')
      const data = await res.json()
      setDomains(data.domains || [])

      // DNS-Status fuer jede Domain laden
      for (const d of data.domains || []) {
        fetch(`/api/email/domains/${d.domain}/dns`)
          .then(r => r.json())
          .then(dns => setDnsStatuses(prev => ({ ...prev, [d.domain]: dns.status })))
          .catch(() => {})
      }
    } catch {}
    setLoading(false)
  }

  const handleOpenAdd = async () => {
    setShowAddModal(true)
    setError('')
    // Projekte und Gruppen laden fuer Dropdown
    try {
      const [pRes, gRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/groups'),
      ])
      const pData = await pRes.json()
      const gData = await gRes.json()
      setProjects(pData.projects || [])
      setGroups(gData.groups || [])
    } catch {}
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newDomain) return setError('Domain ist erforderlich')
    setAdding(true)
    setError('')
    try {
      const res = await fetch('/api/email/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain, groupId: newGroupId || null }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setShowAddModal(false)
        setNewDomain('')
        setNewGroupId('')
        router.push(`/email/setup/${newDomain}`)
      }
    } catch (err) {
      setError('Fehler beim Aktivieren')
    }
    setAdding(false)
  }

  // Projekt-Domains die noch nicht fuer E-Mail aktiviert sind
  const availableProjects = projects
    .filter(p => p.domain && !domains.find(ed => ed.domain === p.domain))

  // Pruefen ob eine Projekt-Domain ausgewaehlt ist
  const selectedProject = availableProjects.find(p => p.domain === newDomain)

  const handleSelectProjectDomain = (domain) => {
    setNewDomain(domain)
    // Gruppe vom Projekt uebernehmen
    const proj = availableProjects.find(p => p.domain === domain)
    if (proj?.groupId) {
      setNewGroupId(proj.groupId)
    } else {
      setNewGroupId('')
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">E-Mail</h1>
        <button onClick={handleOpenAdd}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors">
          Domain hinzufuegen
        </button>
      </div>

      {/* Domain-Karten */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bento-card p-5 animate-pulse">
              <div className="h-6 bg-gray-700 rounded w-1/2 mb-3" />
              <div className="h-4 bg-gray-700 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : domains.length === 0 ? (
        <div className="bento-card p-8 text-center">
          <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-300 mb-2">Noch keine E-Mail-Domains</h3>
          <p className="text-gray-500 mb-4">Aktiviere E-Mail fuer eine Domain, um Postfaecher zu erstellen.</p>
          <button onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors">
            Erste Domain hinzufuegen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {domains.map(d => (
            <DomainCard key={d.domain} domain={d} dnsStatus={dnsStatuses[d.domain]} />
          ))}
        </div>
      )}

      {/* Domain-hinzufuegen Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}>
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">E-Mail fuer Domain aktivieren</h3>

            <form onSubmit={handleAdd} className="space-y-4">
              {/* Domain-Auswahl oder Eingabe */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Domain</label>
                {availableProjects.length > 0 ? (
                  <div className="space-y-2">
                    <select value={selectedProject ? newDomain : ''}
                      onChange={e => handleSelectProjectDomain(e.target.value)}
                      className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                      <option value="">Projekt-Domain waehlen...</option>
                      {availableProjects.map(p => (
                        <option key={p.domain} value={p.domain}>
                          {p.domain} ({p.name})
                        </option>
                      ))}
                    </select>
                    {!selectedProject && (
                      <>
                        <div className="text-center text-xs text-gray-500">oder</div>
                        <input type="text" value={newDomain}
                          onChange={e => { setNewDomain(e.target.value); setNewGroupId('') }}
                          placeholder="Eigene Domain eingeben..."
                          className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                      </>
                    )}
                  </div>
                ) : (
                  <input type="text" value={newDomain}
                    onChange={e => setNewDomain(e.target.value)}
                    placeholder="beispiel.de"
                    className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    autoFocus />
                )}
              </div>

              {/* Gruppen-Zuordnung — automatisch bei Projekt-Domain, manuell bei eigener Domain */}
              {selectedProject?.groupId ? (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Gruppe</label>
                  <div className="w-full bg-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-300 border border-gray-600">
                    {groups.find(g => g.id === selectedProject.groupId)?.name || 'Gruppe'} — uebernommen von {selectedProject.name}
                  </div>
                </div>
              ) : groups.length > 0 && !selectedProject && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Gruppe (optional)</label>
                  <select value={newGroupId}
                    onChange={e => setNewGroupId(e.target.value)}
                    className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    <option value="">Keine Gruppe</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.package})</option>
                    ))}
                  </select>
                </div>
              )}

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors">
                  Abbrechen
                </button>
                <button type="submit" disabled={adding}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50">
                  {adding ? 'Aktiviere...' : 'Aktivieren'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

EmailOverviewPage.getLayout = function getLayout(page, pageProps) {
  return <Layout {...pageProps}>{page}</Layout>
}
