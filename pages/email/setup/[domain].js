// E-Mail Einrichtungs-Wizard — Postfach, DKIM, DNS

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../../components/Layout'
import DnsRecords from '../../../components/email/DnsRecords'
import ConnectionInfo from '../../../components/email/ConnectionInfo'
import { useBreadcrumbs } from '../../../hooks/useBreadcrumbs'

const STEPS = [
  { id: 'mailbox', label: 'Postfach anlegen' },
  { id: 'dkim', label: 'DKIM generieren' },
  { id: 'dns', label: 'DNS einrichten' },
  { id: 'done', label: 'Fertig' },
]

export default function EmailSetupPage() {
  const router = useRouter()
  const { domain } = router.query
  const [step, setStep] = useState(0)
  const [dns, setDns] = useState(null)
  const [checking, setChecking] = useState(false)
  const [dkimGenerating, setDkimGenerating] = useState(false)
  const [dkimDone, setDkimDone] = useState(false)
  const [dkimRecord, setDkimRecord] = useState(null)

  // Postfach-Form
  const [local, setLocal] = useState('')
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdEmail, setCreatedEmail] = useState('')
  const [error, setError] = useState('')

  useBreadcrumbs([
    { label: 'E-Mail', href: '/email' },
    { label: domain || '...' },
    { label: 'Einrichtung' }
  ])

  const checkDns = useCallback(async () => {
    if (!domain) return
    setChecking(true)
    try {
      const res = await fetch(`/api/email/domains/${domain}/dns`)
      const data = await res.json()
      setDns(data)
      // DKIM-Record extrahieren falls vorhanden
      const dkim = data.records?.find(r => r.host?.includes('_domainkey'))
      if (dkim) setDkimRecord(dkim)
    } catch {}
    setChecking(false)
  }, [domain])

  useEffect(() => { checkDns() }, [checkDns])

  const allDnsOk = dns?.status && Object.values(dns.status).filter(v => v).length >= 2

  // Postfach erstellen
  const handleCreateMailbox = async (e) => {
    e.preventDefault()
    setError('')
    if (!local || !password) return setError('Name und Passwort sind erforderlich')
    if (password.length < 8) return setError('Passwort muss mindestens 8 Zeichen haben')

    setCreating(true)
    try {
      const res = await fetch(`/api/email/domains/${domain}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ local, password, quotaMb: 1024 }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setCreatedEmail(data.account.email)
        setStep(1)
      }
    } catch {
      setError('Fehler beim Erstellen')
    }
    setCreating(false)
  }

  // DKIM generieren
  const handleGenerateDkim = async () => {
    setDkimGenerating(true)
    try {
      const res = await fetch(`/api/email/domains/${domain}/dkim`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setDkimDone(true)
        // DNS-Records neu laden um DKIM-Record anzuzeigen
        await checkDns()
      }
    } catch {}
    setDkimGenerating(false)
  }

  const generatePw = () => {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%'
    let pw = ''
    for (let i = 0; i < 16; i++) pw += chars[Math.floor(Math.random() * chars.length)]
    setPassword(pw)
  }

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">E-Mail einrichten: {domain}</h1>

      {/* Schrittanzeige */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            {i > 0 && <div className={`w-8 h-0.5 ${i <= step ? 'bg-blue-500' : 'bg-gray-700'}`} />}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
              i === step ? 'bg-blue-600/20 text-blue-400 font-medium'
                : i < step ? 'bg-green-600/20 text-green-400'
                : 'bg-gray-800 text-gray-500'
            }`}>
              {i < step ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="w-4 text-center">{i + 1}</span>
              )}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Step 1: Erstes Postfach */}
      {step === 0 && (
        <div className="bento-card p-6">
          <h2 className="text-lg font-semibold mb-2">Erstes Postfach anlegen</h2>
          <p className="text-gray-400 text-sm mb-4">
            Lege zuerst dein Postfach an, bevor du die DNS-Eintraege aenderst — so gehen keine E-Mails verloren.
          </p>

          <form onSubmit={handleCreateMailbox} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm text-gray-400 mb-1">E-Mail-Adresse</label>
              <div className="flex">
                <input type="text" value={local}
                  onChange={e => setLocal(e.target.value.toLowerCase())}
                  placeholder="info"
                  className="flex-1 bg-gray-700 rounded-l-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  autoFocus />
                <span className="bg-gray-600 px-3 py-2 text-sm text-gray-300 rounded-r-lg border-l border-gray-500">
                  @{domain}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Passwort</label>
              <div className="flex gap-2">
                <input type="text" value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mindestens 8 Zeichen"
                  className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <button type="button" onClick={generatePw}
                  className="px-3 py-2 text-xs bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors">
                  Generieren
                </button>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button type="submit" disabled={creating}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50">
              {creating ? 'Erstelle...' : 'Postfach erstellen'}
            </button>
          </form>
        </div>
      )}

      {/* Step 2: DKIM generieren */}
      {step === 1 && (
        <div className="bento-card p-6">
          <h2 className="text-lg font-semibold mb-2">DKIM-Key generieren</h2>
          <p className="text-gray-400 text-sm mb-4">
            DKIM signiert ausgehende E-Mails und verbessert die Zustellbarkeit deutlich.
          </p>

          {dkimDone ? (
            <>
              <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4 mb-4">
                <p className="text-green-400 text-sm">DKIM-Key erfolgreich generiert!</p>
              </div>

              {/* DKIM DNS-Record anzeigen zum Kopieren */}
              {dkimRecord && (
                <div className="mb-4">
                  <p className="text-sm text-gray-300 mb-2">Trage diesen DNS-Eintrag bei deinem Domain-Provider ein:</p>
                  <DnsRecords records={[dkimRecord]} status={dns?.status} />
                </div>
              )}
            </>
          ) : (
            <button onClick={handleGenerateDkim} disabled={dkimGenerating}
              className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 mb-4">
              {dkimGenerating ? 'Generiere...' : 'DKIM-Key generieren'}
            </button>
          )}

          <button onClick={() => setStep(2)}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors ml-2">
            Weiter
          </button>
        </div>
      )}

      {/* Step 3: DNS einrichten */}
      {step === 2 && (
        <div className="bento-card p-6">
          <h2 className="text-lg font-semibold mb-2">DNS-Eintraege konfigurieren</h2>
          <p className="text-gray-400 text-sm mb-4">
            Jetzt kannst du die DNS-Eintraege bei deinem Domain-Provider setzen.
            Dein Postfach ist bereit — sobald die DNS-Eintraege aktiv sind, werden E-Mails empfangen.
          </p>

          {dns?.records && <DnsRecords records={dns.records} status={dns.status} />}

          <div className="flex items-center gap-3 mt-6">
            <button onClick={checkDns} disabled={checking}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50">
              {checking ? 'Pruefe...' : 'DNS erneut pruefen'}
            </button>
            <button onClick={() => setStep(3)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                allDnsOk
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-600 hover:bg-gray-500'
              }`}>
              {allDnsOk ? 'Weiter' : 'Trotzdem weiter (DNS kann spaeter konfiguriert werden)'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Fertig */}
      {step === 3 && (
        <div className="bento-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold">E-Mail eingerichtet!</h2>
              <p className="text-gray-400 text-sm">{createdEmail} ist bereit.</p>
            </div>
          </div>

          <h3 className="text-sm font-medium text-gray-300 mb-3">Verbindungseinstellungen:</h3>
          <ConnectionInfo email={createdEmail} />

          <div className="flex gap-3 mt-6">
            <button onClick={() => router.push(`/email/${domain}`)}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              Domain verwalten
            </button>
            <a href="https://webmail.rhdemo.de" target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
              Webmail oeffnen
            </a>
          </div>
        </div>
      )}
    </>
  )
}

EmailSetupPage.getLayout = function getLayout(page, pageProps) {
  return <Layout {...pageProps}>{page}</Layout>
}
