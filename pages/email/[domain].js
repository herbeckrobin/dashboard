// E-Mail Domain-Verwaltung — Postfaecher, Aliases, DNS, Einstellungen

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import CollapsibleSection from '../../components/CollapsibleSection'
import AccountList from '../../components/email/AccountList'
import AccountForm from '../../components/email/AccountForm'
import AutoResponder from '../../components/email/AutoResponder'
import AliasForm from '../../components/email/AliasForm'
import DnsRecords from '../../components/email/DnsRecords'
import ConnectionInfo from '../../components/email/ConnectionInfo'
import MailQueue from '../../components/email/MailQueue'
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs'

export async function getServerSideProps() {
  const { getDomainConfig } = await import('../../lib/config.js')
  const { webmailUrl, mailDomain } = getDomainConfig()
  return { props: { webmailUrl, mailDomain } }
}

export default function EmailDomainPage({ webmailUrl, mailDomain }) {
  const router = useRouter()
  const { domain } = router.query

  const [data, setData] = useState(null)
  const [dns, setDns] = useState(null)
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [editAccount, setEditAccount] = useState(null)
  const [catchAll, setCatchAll] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [dkimGenerating, setDkimGenerating] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [autoReplyAccount, setAutoReplyAccount] = useState(null)

  useBreadcrumbs([
    { label: 'E-Mail', href: '/email' },
    { label: domain || 'Laden...' }
  ])

  const fetchData = useCallback(async () => {
    if (!domain) return
    try {
      const [domainRes, dnsRes, queueRes] = await Promise.all([
        fetch(`/api/email/domains/${domain}`),
        fetch(`/api/email/domains/${domain}/dns`),
        fetch('/api/email/queue'),
      ])
      const domainData = await domainRes.json()
      const dnsData = await dnsRes.json()
      const queueData = await queueRes.json()

      setData(domainData)
      setDns(dnsData)
      setQueue(queueData.queue || [])
      setCatchAll(domainData.domain?.catchAll || '')
    } catch {}
    setLoading(false)
  }, [domain])

  useEffect(() => { fetchData() }, [fetchData])

  // Postfach erstellen
  const handleCreateAccount = async (form) => {
    const res = await fetch(`/api/email/domains/${domain}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const result = await res.json()
    if (result.error) throw new Error(result.error)
    setShowAccountForm(false)
    fetchData()
  }

  // Postfach bearbeiten
  const handleEditAccount = async (form) => {
    const res = await fetch(`/api/email/accounts/${editAccount.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const result = await res.json()
    if (result.error) throw new Error(result.error)
    setEditAccount(null)
    fetchData()
  }

  // Postfach aktivieren/deaktivieren
  const handleToggleAccount = async (account) => {
    await fetch(`/api/email/accounts/${account.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !account.enabled }),
    })
    fetchData()
  }

  // Postfach loeschen
  const handleDeleteAccount = async (account) => {
    await fetch(`/api/email/accounts/${account.id}`, { method: 'DELETE' })
    fetchData()
  }

  // Autoresponder speichern
  const handleSaveAutoReply = async (autoReply) => {
    const res = await fetch(`/api/email/accounts/${autoReplyAccount.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoReply }),
    })
    const result = await res.json()
    if (result.error) throw new Error(result.error)
    setAutoReplyAccount(null)
    fetchData()
  }

  // Alias erstellen
  const handleAddAlias = async ({ source, destination, domain: aliasDomain }) => {
    const res = await fetch('/api/email/aliases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, destination, domain: aliasDomain }),
    })
    const result = await res.json()
    if (result.error) throw new Error(result.error)
    fetchData()
  }

  // Alias loeschen
  const handleDeleteAlias = async (id) => {
    await fetch(`/api/email/aliases/${id}`, { method: 'DELETE' })
    fetchData()
  }

  // Einstellungen speichern
  const handleSaveSettings = async () => {
    setSavingSettings(true)
    await fetch(`/api/email/domains/${domain}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ catchAll: catchAll || null }),
    })
    setSavingSettings(false)
    fetchData()
  }

  // DKIM generieren
  const handleGenerateDkim = async () => {
    setDkimGenerating(true)
    await fetch(`/api/email/domains/${domain}/dkim`, { method: 'POST' })
    setDkimGenerating(false)
    fetchData()
  }

  // Domain loeschen
  const handleDeleteDomain = async () => {
    await fetch(`/api/email/domains/${domain}`, { method: 'DELETE' })
    router.push('/email')
  }

  // Queue
  const handleFlushQueue = async () => {
    await fetch('/api/email/queue', { method: 'POST' })
    fetchData()
  }

  const handleDeleteFromQueue = async (queueId) => {
    await fetch('/api/email/queue', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queueId }),
    })
    fetchData()
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-700 rounded w-1/3" />
        <div className="h-48 bg-gray-800 rounded-xl" />
        <div className="h-32 bg-gray-800 rounded-xl" />
      </div>
    )
  }

  if (!data?.domain) {
    return (
      <div className="bento-card p-8 text-center">
        <p className="text-gray-400">Domain nicht gefunden</p>
      </div>
    )
  }

  const accounts = data.accounts || []
  const aliases = data.aliases || []

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{domain}</h1>
          {!data.domain.enabled && (
            <span className="text-xs bg-red-600/20 text-red-400 px-2 py-1 rounded">Deaktiviert</span>
          )}
        </div>
        <a href={webmailUrl} target="_blank" rel="noopener noreferrer"
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
          Webmail oeffnen
        </a>
      </div>

      {/* DNS Status-Badges */}
      {dns?.status && (
        <div className="flex items-center gap-3 mb-6">
          {Object.entries(dns.status).map(([key, ok]) => (
            <span key={key} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${
              ok ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
              {key.toUpperCase()}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {/* Postfaecher */}
        <CollapsibleSection title={`Postfaecher (${accounts.length})`} defaultOpen={true}>
          <div className="mb-3">
            <button onClick={() => setShowAccountForm(true)}
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              Neues Postfach
            </button>
          </div>
          <AccountList
            accounts={accounts}
            onEdit={setEditAccount}
            onDelete={handleDeleteAccount}
            onToggle={handleToggleAccount}
            onAutoReply={setAutoReplyAccount}
          />
        </CollapsibleSection>

        {/* Weiterleitungen */}
        <CollapsibleSection title={`Weiterleitungen & Aliases (${aliases.length})`} defaultOpen={aliases.length > 0}>
          <AliasForm
            domain={domain}
            aliases={aliases}
            onAdd={handleAddAlias}
            onDelete={handleDeleteAlias}
          />
        </CollapsibleSection>

        {/* DNS-Eintraege */}
        <CollapsibleSection title="DNS-Eintraege" defaultOpen={false}>
          {dns?.records && (
            <DnsRecords records={dns.records} status={dns.status} />
          )}
          {!data.domain.dkimGenerated && (
            <div className="mt-4">
              <button onClick={handleGenerateDkim} disabled={dkimGenerating}
                className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50">
                {dkimGenerating ? 'Generiere DKIM-Key...' : 'DKIM-Key generieren'}
              </button>
            </div>
          )}
        </CollapsibleSection>

        {/* Verbindungsinfo */}
        <CollapsibleSection title="Verbindungsinfo" defaultOpen={false}>
          <ConnectionInfo email={accounts[0]?.email} mailDomain={mailDomain} />
        </CollapsibleSection>

        {/* Einstellungen */}
        <CollapsibleSection title="Einstellungen" defaultOpen={false}>
          <div className="space-y-4">
            {/* Catch-All */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Catch-All (alle nicht zugeordneten Mails an diese Adresse)
              </label>
              <div className="flex gap-2">
                <input type="email" value={catchAll}
                  onChange={e => setCatchAll(e.target.value)}
                  placeholder="Deaktiviert (leer lassen)"
                  className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <button onClick={handleSaveSettings} disabled={savingSettings}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50">
                  {savingSettings ? '...' : 'Speichern'}
                </button>
              </div>
            </div>

            {/* Domain loeschen */}
            <div className="pt-4 border-t border-gray-700/50">
              {deleteConfirm ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-red-400">Wirklich loeschen? Alle Postfaecher und Aliases werden entfernt.</span>
                  <button onClick={handleDeleteDomain}
                    className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
                    Ja, loeschen
                  </button>
                  <button onClick={() => setDeleteConfirm(false)}
                    className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors">
                    Abbrechen
                  </button>
                </div>
              ) : (
                <button onClick={() => setDeleteConfirm(true)}
                  className="px-4 py-2 text-sm bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition-colors">
                  E-Mail fuer Domain deaktivieren
                </button>
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* Mail-Queue */}
        {queue.length > 0 && (
          <CollapsibleSection title={`Mail-Queue (${queue.length})`} defaultOpen={false}>
            <MailQueue
              queue={queue}
              onFlush={handleFlushQueue}
              onDelete={handleDeleteFromQueue}
            />
          </CollapsibleSection>
        )}
      </div>

      {/* Account erstellen Modal */}
      {showAccountForm && (
        <AccountForm
          domain={domain}
          onSave={handleCreateAccount}
          onCancel={() => setShowAccountForm(false)}
        />
      )}

      {/* Account bearbeiten Modal */}
      {editAccount && (
        <AccountForm
          domain={domain}
          account={editAccount}
          onSave={handleEditAccount}
          onCancel={() => setEditAccount(null)}
        />
      )}

      {/* Autoresponder Modal */}
      {autoReplyAccount && (
        <AutoResponder
          account={autoReplyAccount}
          onSave={handleSaveAutoReply}
          onCancel={() => setAutoReplyAccount(null)}
        />
      )}
    </>
  )
}

EmailDomainPage.getLayout = function getLayout(page, pageProps) {
  return <Layout {...pageProps}>{page}</Layout>
}
