import { NextRequest, NextResponse } from 'next/server'
import {
  ADMIN_COOKIE, SESSION_MAX_AGE, adminPassword, createSessionToken, isAdmin, safeEqual,
} from '@/lib/auth'

// Best-effort brute-force protection: 5 failed attempts per IP per 15 minutes.
// The map is per serverless instance, so this slows an attacker down rather
// than stopping one outright — acceptable for a single-admin site.
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5
const failures = new Map<string, { count: number; resetAt: number }>()

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

function isBlocked(ip: string): boolean {
  const entry = failures.get(ip)
  return Boolean(entry && entry.resetAt > Date.now() && entry.count >= MAX_ATTEMPTS)
}

function recordFailure(ip: string) {
  const entry = failures.get(ip)
  if (!entry || entry.resetAt < Date.now()) {
    failures.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS })
  } else {
    entry.count += 1
  }
}

// Session check: lets the admin page skip the login screen while the cookie
// from a previous login is still valid.
export async function GET() {
  return NextResponse.json({ authenticated: await isAdmin() })
}

// Verifies the admin password server-side and, on success, sets an httpOnly
// session cookie holding a signed, expiring token (never the password itself).
export async function POST(request: NextRequest) {
  const pw = adminPassword()
  if (!pw) {
    return NextResponse.json({ error: 'Admin password not configured' }, { status: 503 })
  }

  const ip = clientIp(request)
  if (isBlocked(ip)) {
    return NextResponse.json({ error: 'יותר מדי ניסיונות. נסו שוב בעוד רבע שעה.' }, { status: 429 })
  }

  let body: { password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (typeof body.password !== 'string' || !safeEqual(body.password, pw)) {
    recordFailure(ip)
    return NextResponse.json({ error: 'סיסמה שגויה' }, { status: 401 })
  }

  failures.delete(ip)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  return res
}

// Logout: clear the session cookie.
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(ADMIN_COOKIE)
  return res
}
