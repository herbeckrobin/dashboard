import { getPasskeys, setCurrentChallenge, getRpConfig } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { generateAuthenticationOptions } = await import('@simplewebauthn/server')
  const passkeys = getPasskeys()
  const { rpID } = getRpConfig()

  if (passkeys.length === 0) {
    return res.status(400).json({ error: 'Keine Passkeys registriert' })
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: passkeys.map(pk => ({
      id: pk.credentialID,
    })),
    userVerification: 'preferred',
  })

  setCurrentChallenge(options.challenge)
  return res.json({ success: true, options })
}
