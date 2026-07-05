import { cookies } from 'next/headers'
import { createHash, createHmac, timingSafeEqual } from 'crypto'

// Name of the httpOnly session cookie set after a successful admin login.
export const ADMIN_COOKIE = 'shahar_admin'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

// The admin password lives only on the server (NOT a NEXT_PUBLIC_ var), so it
// never reaches the browser bundle.
export function adminPassword(): string | undefined {
  return process.env.ADMIN_PASSWORD
}

// Key for signing session tokens. A dedicated SESSION_SECRET is preferred so a
// leaked cookie can't be brute-forced back to the password; the admin password
// is the fallback so no extra setup is required.
function sessionSecret(): string | undefined {
  return process.env.SESSION_SECRET ?? process.env.ADMIN_PASSWORD
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

// Constant-time string comparison. Hashing first keeps timingSafeEqual happy
// with different-length inputs and never leaks length information.
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

// Session token: "<expiry-ms>.<hmac>". Self-contained (no server-side session
// store) and — unlike the previous scheme — the cookie does not contain the
// admin password itself.
export function createSessionToken(): string {
  const secret = sessionSecret()
  if (!secret) throw new Error('ADMIN_PASSWORD is not configured')
  const exp = String(Date.now() + SESSION_MAX_AGE * 1000)
  return `${exp}.${sign(exp, secret)}`
}

export function verifySessionToken(token: string | undefined): boolean {
  const secret = sessionSecret()
  if (!secret || !token) return false
  const dot = token.indexOf('.')
  if (dot === -1) return false
  const exp = token.slice(0, dot)
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false
  return safeEqual(token.slice(dot + 1), sign(exp, secret))
}

// True when the current request carries a valid admin session cookie.
export async function isAdmin(): Promise<boolean> {
  const store = await cookies()
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value)
}
