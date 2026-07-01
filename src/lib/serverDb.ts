import { getSupabaseAdmin } from './supabaseAdmin'
import {
  Slot, Booking, MAX_STUDENTS, TEMPLATE_KEY,
  rowToSlot, rowToBooking, templateSlotId, buildDefaultSlots,
} from './types'

// All reads/writes here go through the service-role client, so they run
// regardless of Row Level Security. These functions are the only sanctioned way
// to touch booking data and to mutate the schedule.

// ─── Slots ──────────────────────────────────────────────────────────────────

export async function getTemplate(): Promise<Slot[]> {
  const { data } = await getSupabaseAdmin()
    .from('slots')
    .select('*')
    .eq('week_key', TEMPLATE_KEY)
    .order('day')
    .order('time')

  if (data && data.length > 0) {
    return data.map((row) => ({
      ...rowToSlot(row),
      id: templateSlotId(row.day as number, row.time as string),
    }))
  }
  return buildDefaultSlots()
}

export async function getSlots(weekKey: string): Promise<Slot[]> {
  const { data } = await getSupabaseAdmin()
    .from('slots')
    .select('*')
    .eq('week_key', weekKey)
    .order('day')
    .order('time')

  if (data && data.length > 0) return data.map(rowToSlot)
  return getTemplate()
}

function slotsToRows(slots: Slot[], weekKey: string) {
  return slots.map((s) => ({
    id: weekKey === TEMPLATE_KEY
      ? `tpl-${s.day}-${s.time.replace(':', '')}-${Math.random().toString(36).slice(2, 6)}`
      : s.id,
    day: s.day,
    time: s.time,
    end_time: s.endTime,
    group_type: s.groupType,
    enrolled: s.enrolled,
    week_key: weekKey,
  }))
}

export async function saveSlots(slots: Slot[], weekKey: string): Promise<void> {
  await getSupabaseAdmin().from('slots').delete().eq('week_key', weekKey)
  if (slots.length === 0) return
  await getSupabaseAdmin().from('slots').insert(slotsToRows(slots, weekKey))
}

export async function saveTemplate(slots: Slot[]): Promise<void> {
  await saveSlots(slots, TEMPLATE_KEY)
}

export async function weekHasOverride(weekKey: string): Promise<boolean> {
  const { count } = await getSupabaseAdmin()
    .from('slots')
    .select('*', { count: 'exact', head: true })
    .eq('week_key', weekKey)
  return (count ?? 0) > 0
}

export async function resetWeekToDefault(weekKey: string): Promise<void> {
  await getSupabaseAdmin().from('slots').delete().eq('week_key', weekKey)
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export async function getBookings(): Promise<Booking[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data.map(rowToBooking)
}

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export type NewBooking = Omit<Booking, 'id' | 'createdAt' | 'status'>

export class SlotFullError extends Error {}

// Creates a booking and bumps the slot's enrolled count, enforcing capacity
// server-side so the last seat can't be double-booked from the browser.
export async function createBooking(booking: NewBooking): Promise<Booking> {
  const weekKey = booking.weekKey ?? ''

  // Resolve the slot for this week (falling back to the template) and verify
  // there is still room before committing anything.
  const slots = await getSlots(weekKey)
  const idx = slots.findIndex((s) => s.id === booking.slotId)
  if (idx !== -1 && slots[idx].enrolled >= MAX_STUDENTS) {
    throw new SlotFullError('Slot is full')
  }

  const row = {
    id: generateId(),
    slot_id: booking.slotId,
    week_key: booking.weekKey,
    slot_label: booking.slotLabel,
    student_name: booking.studentName,
    parent_name: booking.parentName,
    phone: booking.phone,
    grade: booking.grade,
    group_preference: booking.groupPreference,
    status: 'pending',
    price: booking.price,
    created_at: new Date().toISOString(),
  }
  const { data, error } = await getSupabaseAdmin().from('bookings').insert(row).select().single()
  if (error || !data) throw new Error('Failed to save booking')

  // Persist the incremented enrolled count for the week (materialising a week
  // override the first time a template-following week takes a booking).
  if (idx !== -1) {
    slots[idx] = { ...slots[idx], enrolled: Math.min(slots[idx].enrolled + 1, MAX_STUDENTS) }
    await saveSlots(slots, weekKey)
  }

  return rowToBooking(data)
}

export async function updateBooking(id: string, updates: Partial<Booking>): Promise<void> {
  const row: Record<string, unknown> = {}
  if (updates.status !== undefined) row.status = updates.status
  if (updates.price !== undefined) row.price = updates.price
  if (updates.slotId !== undefined) row.slot_id = updates.slotId
  if (updates.weekKey !== undefined) row.week_key = updates.weekKey
  if (updates.studentName !== undefined) row.student_name = updates.studentName
  if (updates.parentName !== undefined) row.parent_name = updates.parentName
  if (updates.phone !== undefined) row.phone = updates.phone
  if (updates.grade !== undefined) row.grade = updates.grade
  if (updates.groupPreference !== undefined) row.group_preference = updates.groupPreference
  await getSupabaseAdmin().from('bookings').update(row).eq('id', id)
}

export async function deleteBooking(id: string): Promise<void> {
  await getSupabaseAdmin().from('bookings').delete().eq('id', id)
}
