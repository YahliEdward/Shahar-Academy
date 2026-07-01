import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, adminPassword } from '@/lib/auth'

// Verifies the admin password server-side and, on success, sets an httpOnly
// session cookie. The password itself never reaches the browser bundle.
export async function POST(request: NextRequest) {
  const pw = adminPassword()
  if (!pw) {
    return NextResponse.json({ error: 'Admin password not configured' }, { status: 503 })
  }

  let body: { password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (body.password !== pw) {
    return NextResponse.json({ error: 'סיסמה שגויה' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, pw, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12, // 12 hours
  })
  return res
}

// Logout: clear the session cookie.
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(ADMIN_COOKIE)
  return res
}
