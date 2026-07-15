// Browser-side wrappers around the server route handlers. These replace the
// old direct-to-Supabase calls so the anon key can no longer read or mutate
// booking data from the client.
import { Slot, Booking } from './types'

async function jsonOrThrow(res: Response) {
  if (!res.ok) {
    let msg = 'Request failed'
    try { msg = (await res.json()).error ?? msg } catch {}
    throw new Error(msg)
  }
  return res.json()
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function adminLogin(password: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (res.ok) return { ok: true }
  let error: string | undefined
  try { error = (await res.json()).error } catch {}
  return { ok: false, error }
}

// True when the browser still holds a valid admin session cookie, so the
// dashboard can skip the login screen after a refresh.
export async function adminSession(): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/login')
    if (!res.ok) return false
    return Boolean((await res.json()).authenticated)
  } catch {
    return false
  }
}

export async function adminLogout(): Promise<void> {
  await fetch('/api/admin/login', { method: 'DELETE' })
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export async function fetchBookings(): Promise<Booking[]> {
  const data = await jsonOrThrow(await fetch('/api/admin/bookings'))
  return data.bookings as Booking[]
}

export async function patchBooking(id: string, updates: Partial<Booking>): Promise<void> {
  await jsonOrThrow(await fetch(`/api/admin/bookings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  }))
}

export async function removeBooking(id: string): Promise<void> {
  await jsonOrThrow(await fetch(`/api/admin/bookings/${id}`, { method: 'DELETE' }))
}

export interface AdminNewBookingRequest {
  slotId: string
  weekKey: string
  slotLabel?: string
  studentName: string
  parentName?: string
  phone?: string
  grade?: string
  groupPreference?: string
  price?: number | null
}

// Admin-only creation path — only studentName is required.
export async function adminCreateBooking(payload: AdminNewBookingRequest): Promise<Booking> {
  const data = await jsonOrThrow(await fetch('/api/admin/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }))
  return data.booking as Booking
}

// ─── Slots ──────────────────────────────────────────────────────────────────

export async function fetchTemplate(): Promise<Slot[]> {
  const data = await jsonOrThrow(await fetch('/api/admin/slots?mode=template'))
  return data.slots as Slot[]
}

export async function fetchWeekSlots(weekKey: string): Promise<{ slots: Slot[]; isOverride: boolean }> {
  const data = await jsonOrThrow(await fetch(`/api/admin/slots?weekKey=${encodeURIComponent(weekKey)}`))
  return { slots: data.slots as Slot[], isOverride: Boolean(data.isOverride) }
}

export async function putTemplate(slots: Slot[]): Promise<void> {
  await jsonOrThrow(await fetch('/api/admin/slots', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'template', slots }),
  }))
}

export async function putWeekSlots(weekKey: string, slots: Slot[]): Promise<void> {
  await jsonOrThrow(await fetch('/api/admin/slots', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'week', weekKey, slots }),
  }))
}

// Bump one slot's enrolled count without turning the week into a schedule
// override — the week keeps following the template.
export async function adjustWeekEnrolled(weekKey: string, slotId: string, delta: number): Promise<void> {
  await jsonOrThrow(await fetch('/api/admin/slots', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weekKey, slotId, delta }),
  }))
}

export async function resetWeek(weekKey: string): Promise<void> {
  await jsonOrThrow(await fetch(`/api/admin/slots?weekKey=${encodeURIComponent(weekKey)}`, {
    method: 'DELETE',
  }))
}

// ─── Push notifications ──────────────────────────────────────────────────────

export async function savePushSubscription(subscription: PushSubscriptionJSON): Promise<void> {
  await jsonOrThrow(await fetch('/api/admin/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription }),
  }))
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await jsonOrThrow(await fetch('/api/admin/push', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  }))
}

// ─── Public booking ───────────────────────────────────────────────────────────

export interface BookingRequest {
  slotId: string
  weekKey: string
  slotLabel: string
  studentName: string
  parentName: string
  phone: string
  grade: string
  groupPreference: string
}

export async function submitBooking(payload: BookingRequest): Promise<void> {
  await jsonOrThrow(await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }))
}
