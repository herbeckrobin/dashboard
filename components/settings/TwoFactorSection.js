// 2FA Verwaltung: TOTP + Passkey Setup/Disable

import { useState, useEffect } from 'react'

export default function TwoFactorSection() {
  const [twoFactorType, setTwoFactorType] = useState(null)
  const [totpSetup, setTotpSetup] = useState(null)
  const [totpConfirmCode, setTotpConfirmCode] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })
  const [disablePassword, setDisablePassword] = useState('')
  const [showDisable, setShowDisable] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)

  useEffect(() => {
    fetch('/api/auth')
      .then(res => res.json())
      .then(data => setTwoFactorType(data.twoFactorType || null))
      .catch(() => {})
  }, [])

  const handleSetupTotp = async () => {
    setMessage({ type: '', text: '' })
    try {
      const res = await fetch('/api/auth/two-factor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup-totp' })
      })
      const data = await res.json()
      if (data.success) {
        setTotpSetup({ qrCode: data.qrCode, secret: data.secret })
      } else {
        setMessage({ type: 'error', text: data.error })
      }
    } catch {
      setMessage({ type: 'error', text: 'Verbindungsfehler' })
    }
  }

  const handleConfirmTotp = async () => {
    setMessage({ type: '', text: '' })
    try {
      const res = await fetch('/api/auth/two-factor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm-totp', code: totpConfirmCode })
      })
      const data = await res.json()
      if (data.success) {
        setTwoFactorType('totp')
        setTotpSetup(null)
        setTotpConfirmCode('')
        setMessage({ type: 'success', text: 'TOTP aktiviert!' })
      } else {
        setMessage({ type: 'error', text: data.error })
      }
    } catch {
      setMessage({ type: 'error', text: 'Verbindungsfehler' })
    }
  }

  const handleSetupPasskey = async () => {
    setPasskeyLoading(true)
    setMessage({ type: '', text: '' })
    try {
      const optRes = await fetch('/api/auth/two-factor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup-passkey' })
      })
      const optData = await optRes.json()
      if (!optData.success) {
        setMessage({ type: 'error', text: optData.error })
        setPasskeyLoading(false)
        return
      }

      const { startRegistration } = await import('@simplewebauthn/browser')
      const regResponse = await startRegistration({ optionsJSON: optData.options })

      const confirmRes = await fetch('/api/auth/two-factor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm-passkey', response: regResponse, name: 'Mein Passkey' })
      })
      const confirmData = await confirmRes.json()

      if (confirmData.success) {
        setTwoFactorType('passkey')
        setMessage({ type: 'success', text: 'Passkey registriert!' })
      } else {
        setMessage({ type: 'error', text: confirmData.error })
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setMessage({ type: 'error', text: 'Registrierung abgebrochen' })
      } else {
        setMessage({ type: 'error', text: 'Fehler: ' + err.message })
      }
    }
    setPasskeyLoading(false)
  }

  const handleDisable2FA = async () => {
    setMessage({ type: '', text: '' })
    try {
      const res = await fetch('/api/auth/two-factor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable', password: disablePassword })
      })
      const data = await res.json()
      if (data.success) {
        setTwoFactorType(null)
        setShowDisable(false)
        setDisablePassword('')
        setMessage({ type: 'success', text: '2FA deaktiviert' })
      } else {
        setMessage({ type: 'error', text: data.error })
      }
    } catch {
      setMessage({ type: 'error', text: 'Verbindungsfehler' })
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-semibold mb-4">Zwei-Faktor-Authentifizierung</h2>

      {/* Status */}
      <div className="flex items-center gap-3 mb-6">
        <span className={`w-2.5 h-2.5 rounded-full ${twoFactorType ? 'bg-green-400' : 'bg-gray-500'}`} />
        <span className="text-gray-300">
          {twoFactorType === 'totp' && 'TOTP (Authenticator-App) aktiv'}
          {twoFactorType === 'passkey' && 'Passkey aktiv'}
          {!twoFactorType && 'Nicht aktiviert'}
        </span>
      </div>

      {message.text && (
        <p className={`mb-4 ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
          {message.text}
        </p>
      )}

      {/* TOTP Setup Flow */}
      {totpSetup && (
        <div className="bg-gray-900 rounded-lg p-4 sm:p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">Authenticator-App einrichten</h3>
          <p className="text-gray-400 text-sm mb-4">
            Scanne den QR-Code mit deiner Authenticator-App (Google Authenticator, Authy, etc.)
          </p>
          <div className="flex justify-center mb-4">
            <img src={totpSetup.qrCode} alt="TOTP QR Code" className="w-48 h-48 rounded" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Bestätigungscode eingeben</label>
            <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
              value={totpConfirmCode} onChange={(e) => setTotpConfirmCode(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-gray-700 text-white rounded px-4 py-3 text-center text-xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="000000" />
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={handleConfirmTotp} disabled={totpConfirmCode.length !== 6}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-medium">
              Aktivieren
            </button>
            <button onClick={() => { setTotpSetup(null); setTotpConfirmCode('') }}
              className="bg-gray-600 hover:bg-gray-500 px-6 py-3 rounded-lg font-medium">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Setup Buttons */}
      {!twoFactorType && !totpSetup && (
        <div className="space-y-3">
          <button onClick={handleSetupTotp}
            className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium text-left flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div>
              <div>Authenticator-App (TOTP)</div>
              <div className="text-xs text-blue-300 font-normal">Google Authenticator, Authy, etc.</div>
            </div>
          </button>
          <button onClick={handleSetupPasskey} disabled={passkeyLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 px-6 py-3 rounded-lg font-medium text-left flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
            <div>
              <div>{passkeyLoading ? 'Warte auf Passkey...' : 'Passkey'}</div>
              <div className="text-xs text-purple-300 font-normal">Fingerabdruck, Face ID, Sicherheitsschlüssel</div>
            </div>
          </button>
        </div>
      )}

      {/* Disable 2FA */}
      {twoFactorType && (
        <div className="mt-4">
          {!showDisable ? (
            <button onClick={() => setShowDisable(true)}
              className="text-red-400 hover:text-red-300 text-sm">
              2FA deaktivieren
            </button>
          ) : (
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-3">Passwort eingeben um 2FA zu deaktivieren:</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="password" value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  className="flex-1 bg-gray-700 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Aktuelles Passwort" />
                <div className="flex gap-2">
                  <button onClick={handleDisable2FA}
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-medium">
                    Deaktivieren
                  </button>
                  <button onClick={() => { setShowDisable(false); setDisablePassword('') }}
                    className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded">
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
