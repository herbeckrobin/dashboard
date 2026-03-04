import {
  getAuth, saveAuth, requireAuth, checkPassword,
  generateTotpSecret, getTotpUri, verifyTotp,
  setCurrentChallenge, getRpConfig, savePasskey,
} from '../../../lib/auth'
import QRCode from 'qrcode'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!await requireAuth(req, res)) return

  const { action, code, password, name } = req.body

  // Setup TOTP - generate secret + QR code
  if (action === 'setup-totp') {
    const secret = generateTotpSecret()
    const uri = getTotpUri(secret)
    const qrCode = await QRCode.toDataURL(uri)

    // Store pending secret (not yet confirmed)
    const auth = getAuth()
    if (!auth.twoFactor) auth.twoFactor = { type: null, totpSecret: null, passkeys: [] }
    auth.twoFactor._pendingTotpSecret = secret
    saveAuth(auth)

    return res.json({ success: true, qrCode, secret })
  }

  // Confirm TOTP - verify code and activate
  if (action === 'confirm-totp') {
    const auth = getAuth()
    const pendingSecret = auth.twoFactor?._pendingTotpSecret
    if (!pendingSecret) {
      return res.status(400).json({ error: 'Kein TOTP-Setup gestartet' })
    }

    if (!verifyTotp(pendingSecret, code)) {
      return res.status(400).json({ error: 'Ungültiger Code. Bitte erneut versuchen.' })
    }

    auth.twoFactor.type = 'totp'
    auth.twoFactor.totpSecret = pendingSecret
    delete auth.twoFactor._pendingTotpSecret
    saveAuth(auth)

    return res.json({ success: true, message: 'TOTP aktiviert' })
  }

  // Setup Passkey - generate registration options
  if (action === 'setup-passkey') {
    const { generateRegistrationOptions } = await import('@simplewebauthn/server')
    const { rpName, rpID } = getRpConfig()
    const auth = getAuth()
    const existingPasskeys = auth.twoFactor?.passkeys || []

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: 'admin',
      attestationType: 'none',
      excludeCredentials: existingPasskeys.map(pk => ({
        id: pk.credentialID,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    })

    setCurrentChallenge(options.challenge)
    return res.json({ success: true, options })
  }

  // Confirm Passkey - verify registration response
  if (action === 'confirm-passkey') {
    const { verifyRegistrationResponse } = await import('@simplewebauthn/server')
    const { getCurrentChallenge } = await import('../../../lib/auth')
    const { rpID, origin } = getRpConfig()

    const challenge = getCurrentChallenge()
    if (!challenge) {
      return res.status(400).json({ error: 'Keine Challenge vorhanden' })
    }

    try {
      const { response } = req.body
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      })

      if (!verification.verified || !verification.registrationInfo) {
        return res.status(400).json({ error: 'Registrierung fehlgeschlagen' })
      }

      const { credential } = verification.registrationInfo

      savePasskey({
        credentialID: credential.id,
        credentialPublicKey: Buffer.from(credential.publicKey).toString('base64'),
        counter: credential.counter,
        name: name || `Passkey ${new Date().toLocaleDateString('de-DE')}`,
        createdAt: new Date().toISOString(),
      })

      return res.json({ success: true, message: 'Passkey registriert' })
    } catch (err) {
      return res.status(400).json({ error: 'Passkey-Fehler: ' + err.message })
    }
  }

  // Disable 2FA
  if (action === 'disable') {
    const auth = getAuth()
    if (!password) {
      return res.status(400).json({ error: 'Passwort erforderlich' })
    }
    const valid = await checkPassword(password, auth.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Falsches Passwort' })
    }

    auth.twoFactor = { type: null, totpSecret: null, passkeys: [] }
    saveAuth(auth)

    return res.json({ success: true, message: '2FA deaktiviert' })
  }

  return res.status(400).json({ error: 'Unbekannte Aktion' })
}
