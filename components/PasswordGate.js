import { useState, useEffect } from 'react'
import Layout from './Layout'

export default function PasswordGate({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false)
  const [twoFactorType, setTwoFactorType] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [error, setError] = useState('')
  const [blocked, setBlocked] = useState(false)
  const [blockMinutes, setBlockMinutes] = useState(0)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const res = await fetch('/api/auth')
      const data = await res.json()

      if (data.authenticated) {
        setIsAuthenticated(true)
      } else if (!data.setupComplete) {
        setNeedsSetup(true)
      }
    } catch {
      // Server not reachable
    }
    setIsLoading(false)
  }

  const handleSetup = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein')
      return
    }
    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen haben')
      return
    }

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup', password })
      })
      const data = await res.json()

      if (data.success) {
        setNeedsSetup(false)
        setIsAuthenticated(true)
      } else {
        setError(data.error || 'Fehler beim Setup')
      }
    } catch {
      setError('Verbindungsfehler')
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', password })
      })
      const data = await res.json()

      if (data.blocked) {
        setBlocked(true)
        setBlockMinutes(data.remainingMinutes)
        return
      }

      if (data.success && data.needsTwoFactor) {
        setNeedsTwoFactor(true)
        setTwoFactorType(data.twoFactorType)
        setPassword('')

        // Auto-trigger passkey
        if (data.twoFactorType === 'passkey') {
          triggerPasskeyAuth()
        }
        return
      }

      if (data.success) {
        setIsAuthenticated(true)
      } else if (data.needsSetup) {
        setNeedsSetup(true)
      } else {
        setError(data.error || 'Falsches Passwort')
        setPassword('')
      }
    } catch {
      setError('Verbindungsfehler')
    }
  }

  const handleVerifyTotp = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-totp', code: totpCode })
      })
      const data = await res.json()

      if (data.success) {
        setNeedsTwoFactor(false)
        setIsAuthenticated(true)
      } else {
        setError(data.error || 'Ungültiger Code')
        setTotpCode('')
      }
    } catch {
      setError('Verbindungsfehler')
    }
  }

  const triggerPasskeyAuth = async () => {
    setError('')
    try {
      // Get challenge
      const challengeRes = await fetch('/api/auth/passkey-challenge', { method: 'POST' })
      const challengeData = await challengeRes.json()
      if (!challengeData.success) {
        setError(challengeData.error || 'Passkey-Fehler')
        return
      }

      // Use browser WebAuthn API
      const { startAuthentication } = await import('@simplewebauthn/browser')
      const authResponse = await startAuthentication({ optionsJSON: challengeData.options })

      // Verify on server
      const verifyRes = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-passkey', response: authResponse })
      })
      const verifyData = await verifyRes.json()

      if (verifyData.success) {
        setNeedsTwoFactor(false)
        setIsAuthenticated(true)
      } else {
        setError(verifyData.error || 'Passkey-Verifizierung fehlgeschlagen')
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Passkey-Anfrage abgebrochen')
      } else {
        setError('Passkey-Fehler: ' + err.message)
      }
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' })
    })
    setIsAuthenticated(false)
    setNeedsTwoFactor(false)
    setPassword('')
    setTotpCode('')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Lädt...</div>
      </div>
    )
  }

  // Setup
  if (needsSetup) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-6 sm:p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-white mb-2 text-center">Deploy Dashboard</h1>
          <p className="text-gray-400 text-center mb-6">Erstmalige Einrichtung — Passwort festlegen</p>

          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Neues Passwort</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mindestens 8 Zeichen" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Passwort bestätigen</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Passwort wiederholen" />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg">
              Passwort speichern
            </button>
          </form>
        </div>
      </div>
    )
  }

  // 2FA - TOTP
  if (needsTwoFactor && twoFactorType === 'totp') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-6 sm:p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-white mb-2 text-center">Zwei-Faktor</h1>
          <p className="text-gray-400 text-center mb-6">Code aus deiner Authenticator-App eingeben</p>

          <form onSubmit={handleVerifyTotp} className="space-y-4">
            <div>
              <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-gray-700 text-white rounded px-4 py-3 text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="000000" autoFocus autoComplete="one-time-code" />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={totpCode.length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 rounded-lg">
              Bestätigen
            </button>
            <button type="button" onClick={() => { setNeedsTwoFactor(false); setError('') }}
              className="w-full text-gray-400 hover:text-white text-sm py-2">
              Zurück zum Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  // 2FA - Passkey
  if (needsTwoFactor && twoFactorType === 'passkey') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-6 sm:p-8 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Passkey</h1>
          <p className="text-gray-400 mb-6">Bestätige deine Identität mit deinem Passkey</p>

          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
          </div>

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          <button onClick={triggerPasskeyAuth}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg mb-3">
            Passkey verwenden
          </button>
          <button onClick={() => { setNeedsTwoFactor(false); setError('') }}
            className="w-full text-gray-400 hover:text-white text-sm py-2">
            Zurück zum Login
          </button>
        </div>
      </div>
    )
  }

  // Login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-6 sm:p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">Deploy Dashboard</h1>

          {blocked ? (
            <div className="text-center">
              <p className="text-red-400 mb-4">Zu viele fehlgeschlagene Versuche.</p>
              <p className="text-gray-400">Bitte warte {blockMinutes} Minuten.</p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Passwort</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Admin-Passwort eingeben" autoFocus />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg">
                Anmelden
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  // Authenticated
  return (
    <Layout onLogout={handleLogout}>
      {children}
    </Layout>
  )
}
