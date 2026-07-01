import { cookies } from 'next/headers'

// Name of the httpOnly session cookie set after a successful admin login.
export const ADMIN_COOKIE = 'shahar_admin'

// The admin password lives only on the server (NOT a NEXT_PUBLIC_ var), so it
// never reaches the browser bundle.
export function adminPassword(): string | undefined {
  return process.env.ADMIN_PASSWORD
}

// True when the current request carries a valid admin session cookie.
export async function isAdmin(): Promise<boolean> {
  const pw = adminPassword()
  if (!pw) return false
  const store = await cookies()
  return store.get(ADMIN_COOKIE)?.value === pw
}
