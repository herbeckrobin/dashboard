import {
  getAuth, saveAuth, migrateIfNeeded, hashPassword, checkPassword,
  createSession, verifySession, setSessionCookie, clearSessionCookie,
  checkRateLimit, recordAttempt, getClientIp,
} from '../../../lib/auth'

function parseCookies(req) {
  const cookie = req.headers.cookie || ''
  const cookies = {}
  cookie.split(';').forEach(c => {
    const [key, ...val] = c.trim().split('=')
    if (key) cookies[key] = val.join('=')
  })
  return cookies
}

export default async function handler(req, res) {
  migrateIfNeeded()

  // GET - Check auth status
  if (req.method === 'GET') {
    const auth = getAuth()
    const cookies = parseCookies(req)
    const token = cookies.session
    let authenticated = false

    if (token) {
      const payload = await verifySession(token)
      authenticated = !!payload
    }

    return res.json({
      authenticated,
      setupComplete: auth.setupComplete && !!auth.passwordHash,
      twoFactorType: auth.twoFactor?.type || null,
    })
  }

  // POST - Login, Setup, Change, Logout
  if (req.method === 'POST') {
    const { action, password, currentPassword, newPassword, code } = req.body
    const ip = getClientIp(req)

    // Setup
    if (action === 'setup') {
      if (getAuth().setupComplete && getAuth().passwordHash) {
        return res.status(400).json({ error: 'Setup bereits abgeschlossen' })
      }
      if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben' })
      }

      const auth = getAuth()
      auth.passwordHash = await hashPassword(password)
      auth.setupComplete = true
      if (!auth.jwtSecret) {
        const crypto = await import('crypto')
        auth.jwtSecret = crypto.randomBytes(32).toString('hex')
      }
      if (!auth.twoFactor) auth.twoFactor = { type: null, totpSecret: null, passkeys: [] }
      if (!auth.rateLimiter) auth.rateLimiter = { attempts: {}, blocked: {} }
      saveAuth(auth)

      const jwt = await createSession()
      setSessionCookie(res, jwt)

      // Initial Bootstrap: alle Server-Rules enforcen (async im Hintergrund)
      // Installiert PHP, MariaDB, Docker, Gitea, E-Mail, Firewall, etc.
      import('../../../lib/rules/index.js').then(({ enforceAll, runAudit }) => {
        console.log('[BOOTSTRAP] Starte initiales Server-Setup...')
        enforceAll().then(result => {
          console.log(`[BOOTSTRAP] Fertig: ${result.enforced} enforced, ${result.skipped} uebersprungen, ${result.failed} fehlgeschlagen`)
          // Audit nach Bootstrap fuer Score-Berechnung
          runAudit({ trigger: 'bootstrap' }).catch(() => {})
        }).catch(err => {
          console.error('[BOOTSTRAP] Fehler:', err.message)
        })
      }).catch(() => {})

      return res.json({ success: true })
    }

    // Login
    if (action === 'login') {
      const auth = getAuth()
      if (!auth.setupComplete || !auth.passwordHash) {
        return res.status(400).json({ error: 'Setup nicht abgeschlossen', needsSetup: true })
      }

      // Rate limit check
      const rl = checkRateLimit(ip)
      if (rl.blocked) {
        return res.status(429).json({
          error: `Zu viele Versuche. Bitte ${rl.remainingMinutes} Min. warten.`,
          blocked: true,
          remainingMinutes: rl.remainingMinutes,
        })
      }

      const valid = await checkPassword(password, auth.passwordHash)
      if (!valid) {
        recordAttempt(ip, false)
        return res.status(401).json({ error: 'Falsches Passwort' })
      }

      recordAttempt(ip, true)

      // Check if 2FA is enabled
      if (auth.twoFactor?.type) {
        return res.json({
          success: true,
          needsTwoFactor: true,
          twoFactorType: auth.twoFactor.type,
        })
      }

      // No 2FA - create session directly
      const jwt = await createSession()
      setSessionCookie(res, jwt)
      return res.json({ success: true })
    }

    // Verify TOTP
    if (action === 'verify-totp') {
      const auth = getAuth()
      if (auth.twoFactor?.type !== 'totp' || !auth.twoFactor?.totpSecret) {
        return res.status(400).json({ error: 'TOTP nicht eingerichtet' })
      }

      const { verifyTotp } = await import('../../../lib/auth')
      if (!verifyTotp(auth.twoFactor.totpSecret, code)) {
        return res.status(401).json({ error: 'Ungültiger Code' })
      }

      const jwt = await createSession()
      setSessionCookie(res, jwt)
      return res.json({ success: true })
    }

    // Verify Passkey
    if (action === 'verify-passkey') {
      const { getCurrentChallenge, getPasskeys, getRpConfig } = await import('../../../lib/auth')
      const { verifyAuthenticationResponse } = await import('@simplewebauthn/server')

      const challenge = getCurrentChallenge()
      if (!challenge) {
        return res.status(400).json({ error: 'Keine Challenge vorhanden' })
      }

      const passkeys = getPasskeys()
      const { rpID, origin } = getRpConfig()

      try {
        const { response: authResponse } = req.body
        const matchingPasskey = passkeys.find(pk => pk.credentialID === authResponse.id)
        if (!matchingPasskey) {
          return res.status(401).json({ error: 'Passkey nicht gefunden' })
        }

        const verification = await verifyAuthenticationResponse({
          response: authResponse,
          expectedChallenge: challenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
          credential: {
            id: matchingPasskey.credentialID,
            publicKey: new Uint8Array(Buffer.from(matchingPasskey.credentialPublicKey, 'base64')),
            counter: matchingPasskey.counter,
          },
        })

        if (!verification.verified) {
          return res.status(401).json({ error: 'Passkey-Verifizierung fehlgeschlagen' })
        }

        // Update counter
        matchingPasskey.counter = verification.authenticationInfo.newCounter
        const authData = getAuth()
        saveAuth(authData)

        const jwt = await createSession()
        setSessionCookie(res, jwt)
        return res.json({ success: true })
      } catch (err) {
        return res.status(401).json({ error: 'Passkey-Fehler: ' + err.message })
      }
    }

    // Change password
    if (action === 'change') {
      const auth = getAuth()
      const valid = await checkPassword(currentPassword, auth.passwordHash)
      if (!valid) {
        return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' })
      }
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'Neues Passwort muss mindestens 8 Zeichen haben' })
      }
      auth.passwordHash = await hashPassword(newPassword)
      saveAuth(auth)
      return res.json({ success: true, message: 'Passwort geändert' })
    }

    // Logout
    if (action === 'logout') {
      clearSessionCookie(res)
      return res.json({ success: true })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
