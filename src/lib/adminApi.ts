// Browser-side wrappers around the server route handlers. These replace the
// old direct-to-Supabase calls so the anon key can no longer read or mutate
// booking data from the client.
import { Slot, Booking, GroupType } from './types'

async function jsonOrThrow(res: Response) {
  if (!res.ok) {
    let msg = 'Request failed'
    try { msg = (await res.json()).error ?? msg } catch {}
    throw new Error(msg)
  }
  return res.json()
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function adminLogin(password: string): Promise<boolean> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  return res.ok
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

export async function resetWeek(weekKey: string): Promise<void> {
  await jsonOrThrow(await fetch(`/api/admin/slots?weekKey=${encodeURIComponent(weekKey)}`, {
    method: 'DELETE',
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
  groupPreference: GroupType
}

export async function submitBooking(payload: BookingRequest): Promise<void> {
  await jsonOrThrow(await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }))
}
