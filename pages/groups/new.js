// Neue Gruppe erstellen (Paket waehlen + Limits konfigurieren)

import { useState } from 'react'
import { useRouter } from 'next/router'
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs'

const PACKAGES = [
  {
    id: 'starter',
    label: 'Starter',
    description: 'Kleine Websites, Portfolios & Blogs',
    price: '25 €/Monat',
    color: 'border-blue-500 bg-blue-500/5',
    selectedColor: 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-500/10',
    limits: { projects: 1, storage: 5, domains: 1, email: { count: 3, sizeGb: 1 }, support: { type: 'email', responseHours: 48 } }
  },
  {
    id: 'business',
    label: 'Business',
    description: 'Unternehmen, Webapps & individuelle Projekte',
    price: '49 €/Monat',
    color: 'border-purple-500 bg-purple-500/5',
    selectedColor: 'border-purple-500 ring-2 ring-purple-500/30 bg-purple-500/10',
    limits: { projects: 3, storage: 15, domains: 3, email: { count: 20, sizeGb: 5 }, support: { type: 'email+phone', responseHours: 24 } }
  },
  {
    id: 'unbegrenzt',
    label: 'Unbegrenzt',
    description: 'Eigene Projekte oder Premium-Kunden',
    price: 'Individuell',
    color: 'border-green-500 bg-green-500/5',
    selectedColor: 'border-green-500 ring-2 ring-green-500/30 bg-green-500/10',
    limits: { projects: -1, storage: -1, domains: -1, email: { count: -1, sizeGb: -1 }, support: { type: 'email+phone', responseHours: 24 } }
  }
]

export default function NewGroupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [selectedPkg, setSelectedPkg] = useState(null)
  const [limits, setLimits] = useState(null)
  const [extraStorage, setExtraStorage] = useState(0)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useBreadcrumbs([
    { label: 'Gruppen', href: '/groups' },
    { label: 'Neue Gruppe' }
  ])

  function selectPackage(pkg) {
    setSelectedPkg(pkg.id)
    setLimits(JSON.parse(JSON.stringify(pkg.limits)))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name || !selectedPkg) return
    setSaving(true)
    setError('')

    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, package: selectedPkg, notes })
    })

    if (res.ok) {
      const data = await res.json()
      // Limits anpassen falls geaendert
      if (limits || extraStorage) {
        await fetch(`/api/groups/${data.group.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limits, extraStorage })
        })
      }
      router.push(`/groups/${data.group.id}`)
    } else {
      const data = await res.json()
      setError(data.error || 'Fehler beim Erstellen')
      setSaving(false)
    }
  }

  const isUnlimited = limits?.projects === -1

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">Neue Gruppe</h1>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-2">Gruppenname</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
                 placeholder="z.B. Mustermann GmbH"
                 className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                 required />
        </div>

        {/* Paket-Auswahl */}
        <div>
          <label className="block text-sm font-medium mb-3">Paket wählen</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PACKAGES.map(pkg => (
              <button key={pkg.id} type="button" onClick={() => selectPackage(pkg)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  selectedPkg === pkg.id ? pkg.selectedColor : 'border-gray-700 hover:border-gray-600'
                }`}>
                <div className="font-semibold mb-1">{pkg.label}</div>
                <div className="text-xs text-gray-400 mb-2">{pkg.description}</div>
                <div className="text-sm font-medium text-gray-300">{pkg.price}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Limits anpassen (nur wenn Paket gewaehlt und nicht unbegrenzt) */}
        {limits && !isUnlimited && (
          <div className="bg-gray-800 rounded-xl p-5 space-y-4">
            <h3 className="font-medium text-sm text-gray-300">Limits anpassen</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Projekte</label>
                <input type="number" min="1" value={limits.projects}
                       onChange={e => setLimits({ ...limits, projects: parseInt(e.target.value) || 1 })}
                       className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Speicher (GB)</label>
                <input type="number" min="1" value={limits.storage}
                       onChange={e => setLimits({ ...limits, storage: parseInt(e.target.value) || 1 })}
                       className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Domains</label>
                <input type="number" min="1" value={limits.domains}
                       onChange={e => setLimits({ ...limits, domains: parseInt(e.target.value) || 1 })}
                       className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>

            {/* Extra-Speicher */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Extra-Speicher (+2 €/5 GB pro Monat)</label>
              <div className="flex items-center gap-3">
                <input type="range" min="0" max="100" step="5" value={extraStorage}
                       onChange={e => setExtraStorage(parseInt(e.target.value))}
                       className="flex-1 accent-blue-500" />
                <span className="text-sm font-medium w-16 text-right">
                  {extraStorage > 0 ? `+${extraStorage} GB` : '0'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* E-Mail Info (nur Anzeige) */}
        {limits && !isUnlimited && (
          <div className="text-xs text-gray-500 bg-gray-800/50 rounded-lg px-4 py-3">
            E-Mail: {limits.email.count} Postfächer à {limits.email.sizeGb} GB ·
            Support: {limits.support.type === 'email+phone' ? 'E-Mail + Telefon' : 'E-Mail'} ({limits.support.responseHours}h)
          </div>
        )}

        {/* Notizen */}
        <div>
          <label className="block text-sm font-medium mb-2">Notizen <span className="text-gray-500">(optional)</span></label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    rows={2} placeholder="Interne Notizen zu diesem Kunden..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-sm" />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        <button type="submit" disabled={!name || !selectedPkg || saving}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors">
          {saving ? 'Erstellt...' : 'Gruppe erstellen'}
        </button>
      </form>
    </>
  )
}
