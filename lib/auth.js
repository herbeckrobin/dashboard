import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import * as OTPAuth from 'otpauth'
import { getDomainConfig } from './config.js'

const AUTH_FILE = path.join(process.cwd(), 'data', 'auth.json')
const RP_NAME = 'Admin Dashboard'

function getRpId() {
  const { adminDomain } = getDomainConfig()
  return adminDomain || 'localhost'
}
function getRpOrigin() {
  const id = getRpId()
  return `https://${id}`
}

// --- Data Access ---

export function getAuth() {
  try {
    const data = fs.readFileSync(AUTH_FILE, 'utf8')
    return JSON.parse(data)
  } catch {
    return {
      setupComplete: false,
      passwordHash: null,
      jwtSecret: null,
      twoFactor: { type: null, totpSecret: null, passkeys: [] },
      rateLimiter: { attempts: {}, blocked: {} },
    }
  }
}

export function saveAuth(auth) {
  fs.writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2))
}

// Auto-migrate from plaintext password
export function migrateIfNeeded() {
  const auth = getAuth()
  if (auth.password && !auth.passwordHash) {
    auth.passwordHash = bcrypt.hashSync(auth.password, 10)
    delete auth.password
    if (!auth.jwtSecret) auth.jwtSecret = crypto.randomBytes(32).toString('hex')
    if (!auth.twoFactor) auth.twoFactor = { type: null, totpSecret: null, passkeys: [] }
    if (!auth.rateLimiter) auth.rateLimiter = { attempts: {}, blocked: {} }
    saveAuth(auth)
  }
  return auth
}

// --- Password ---

export async function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

export async function checkPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

// --- JWT Sessions ---

function getJwtSecret() {
  const auth = getAuth()
  if (!auth.jwtSecret) {
    auth.jwtSecret = crypto.randomBytes(32).toString('hex')
    saveAuth(auth)
  }
  return new TextEncoder().encode(auth.jwtSecret)
}

export async function createSession() {
  const secret = getJwtSecret()
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifySession(token) {
  try {
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch {
    return null
  }
}

export function setSessionCookie(res, jwt) {
  res.setHeader('Set-Cookie', `session=${jwt}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`)
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0')
}

function parseCookies(req) {
  const cookie = req.headers.cookie || ''
  const cookies = {}
  cookie.split(';').forEach(c => {
    const [key, ...val] = c.trim().split('=')
    if (key) cookies[key] = val.join('=')
  })
  return cookies
}

// --- Auth Middleware ---

export async function requireAuth(req, res) {
  // Allow internal requests from webhook server via shared secret
  const internalToken = req.headers['x-internal-token']
  if (internalToken) {
    const auth = getAuth()
    if (auth.internalToken && internalToken === auth.internalToken) {
      return true
    }
  }

  const cookies = parseCookies(req)
  const token = cookies.session
  if (!token) {
    res.status(401).json({ error: 'Nicht authentifiziert' })
    return false
  }
  const payload = await verifySession(token)
  if (!payload) {
    clearSessionCookie(res)
    res.status(401).json({ error: 'Session abgelaufen' })
    return false
  }
  return true
}

// --- Rate Limiting ---

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 min
const RATE_LIMIT_BLOCK = 15 * 60 * 1000 // 15 min block

export function checkRateLimit(ip) {
  const auth = getAuth()
  const rl = auth.rateLimiter || { attempts: {}, blocked: {} }

  // Check if blocked
  if (rl.blocked[ip] && Date.now() < rl.blocked[ip]) {
    const remaining = Math.ceil((rl.blocked[ip] - Date.now()) / 60000)
    return { blocked: true, remainingMinutes: remaining }
  }

  // Clean expired block
  if (rl.blocked[ip] && Date.now() >= rl.blocked[ip]) {
    delete rl.blocked[ip]
    delete rl.attempts[ip]
    auth.rateLimiter = rl
    saveAuth(auth)
  }

  return { blocked: false }
}

export function recordAttempt(ip, success) {
  const auth = getAuth()
  if (!auth.rateLimiter) auth.rateLimiter = { attempts: {}, blocked: {} }
  const rl = auth.rateLimiter

  if (success) {
    delete rl.attempts[ip]
    delete rl.blocked[ip]
    auth.rateLimiter = rl
    saveAuth(auth)
    return
  }

  // Failed attempt
  if (!rl.attempts[ip]) rl.attempts[ip] = []
  rl.attempts[ip].push(Date.now())

  // Clean old attempts
  rl.attempts[ip] = rl.attempts[ip].filter(t => Date.now() - t < RATE_LIMIT_WINDOW)

  // Block if too many
  if (rl.attempts[ip].length >= RATE_LIMIT_MAX) {
    rl.blocked[ip] = Date.now() + RATE_LIMIT_BLOCK
    delete rl.attempts[ip]
  }

  auth.rateLimiter = rl
  saveAuth(auth)
}

function getClientIp(req) {
  // x-real-ip wird von nginx gesetzt ($remote_addr) und ist nicht client-seitig manipulierbar
  // x-forwarded-for ist unsicher da vom Client frei setzbar (Rate-Limit-Bypass)
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown'
}

export { getClientIp }

// --- TOTP ---

export function generateTotpSecret() {
  const secret = crypto.randomBytes(20).toString('hex')
  return secret
}

export function getTotpUri(secret) {
  const totp = new OTPAuth.TOTP({
    issuer: RP_NAME,
    label: 'admin',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromHex(secret),
  })
  return totp.toString()
}

export function verifyTotp(secret, code) {
  const totp = new OTPAuth.TOTP({
    issuer: RP_NAME,
    label: 'admin',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromHex(secret),
  })
  const delta = totp.validate({ token: code, window: 1 })
  return delta !== null
}

// --- Passkeys / WebAuthn ---

// Challenge mit Ablaufzeit und Replay-Schutz (in-memory, per-process)
let currentChallenge = null
let challengeTimestamp = null
const CHALLENGE_TIMEOUT = 5 * 60 * 1000 // 5 Minuten

export function setCurrentChallenge(challenge) {
  currentChallenge = challenge
  challengeTimestamp = Date.now()
}

export function getCurrentChallenge() {
  if (!currentChallenge || !challengeTimestamp) return null
  // Abgelaufene Challenge verwerfen
  if (Date.now() - challengeTimestamp > CHALLENGE_TIMEOUT) {
    currentChallenge = null
    challengeTimestamp = null
    return null
  }
  // Challenge nach Verwendung loeschen (Replay-Schutz)
  const challenge = currentChallenge
  currentChallenge = null
  challengeTimestamp = null
  return challenge
}

export function getRpConfig() {
  return { rpName: RP_NAME, rpID: getRpId(), origin: getRpOrigin() }
}

export function getPasskeys() {
  const auth = getAuth()
  return auth.twoFactor?.passkeys || []
}

export function savePasskey(passkey) {
  const auth = getAuth()
  if (!auth.twoFactor) auth.twoFactor = { type: null, totpSecret: null, passkeys: [] }
  auth.twoFactor.passkeys.push(passkey)
  auth.twoFactor.type = 'passkey'
  saveAuth(auth)
}

export function isSetupComplete() {
  const auth = migrateIfNeeded()
  return auth.setupComplete && !!auth.passwordHash
}
