import { getSupabaseAdmin } from './supabaseAdmin'
import {
  Slot, Booking, GroupType, MAX_STUDENTS, TEMPLATE_KEY,
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
  const db = getSupabaseAdmin()
  const { error: deleteError } = await db.from('slots').delete().eq('week_key', weekKey)
  if (deleteError) throw new Error(`Failed to clear slots for ${weekKey}: ${deleteError.message}`)
  if (slots.length === 0) return
  const { error: insertError } = await db.from('slots').insert(slotsToRows(slots, weekKey))
  if (insertError) throw new Error(`Failed to save slots for ${weekKey}: ${insertError.message}`)
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
export class SlotNotFoundError extends Error {}
export class SlotPastError extends Error {}

// Wall-clock comparison in Israel time, so the serverless region's timezone
// doesn't affect the result. Both sides use the "YYYY-MM-DD HH:mm" format, so
// plain string comparison is chronological.
function isSlotInPast(slot: Slot, weekKey: string): boolean {
  const start = new Date(`${weekKey}T00:00:00Z`)
  if (Number.isNaN(start.getTime())) return false
  start.setUTCDate(start.getUTCDate() + slot.day)
  const slotStamp = `${start.toISOString().slice(0, 10)} ${slot.time}`
  const nowInIsrael = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Jerusalem',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date())
  return slotStamp < nowInIsrael
}

// Copies the template into concrete rows the first time a template-following
// week takes a booking, so the capacity update below can target a real row.
// Concurrent calls are safe: duplicate inserts hit the (id, week_key) primary
// key and the week is simply re-read.
async function ensureWeekSlots(weekKey: string): Promise<Slot[]> {
  const db = getSupabaseAdmin()
  const readWeek = async () => {
    const { data } = await db.from('slots').select('*')
      .eq('week_key', weekKey).order('day').order('time')
    return data && data.length > 0 ? data.map(rowToSlot) : null
  }

  const existing = await readWeek()
  if (existing) return existing

  const template = await getTemplate()
  const { error } = await db.from('slots').insert(slotsToRows(template, weekKey))
  if (error) {
    // Unique violation → either a concurrent request materialised the week
    // (fine, re-read) or the DB still has the old single-column PK and the
    // insert collided with another week's rows (migration not run yet).
    const reread = await readWeek()
    if (reread) return reread
    throw new Error(`Failed to materialise week ${weekKey}: ${error.message}`)
  }
  return template
}

function bookingRow(booking: NewBooking) {
  return {
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
}

// Pre-migration path (old delete/reinsert persistence, non-atomic capacity
// check). Kept so bookings don't break if the code deploys before the
// adjust_enrolled() function from supabase-schema.sql exists.
async function createBookingLegacy(booking: NewBooking, weekKey: string): Promise<Booking> {
  const slots = await getSlots(weekKey)
  const idx = slots.findIndex((s) => s.id === booking.slotId)
  if (idx !== -1 && slots[idx].enrolled >= MAX_STUDENTS) {
    throw new SlotFullError('Slot is full')
  }

  const { data, error } = await getSupabaseAdmin()
    .from('bookings').insert(bookingRow(booking)).select().single()
  if (error || !data) throw new Error('Failed to save booking')

  if (idx !== -1) {
    slots[idx] = { ...slots[idx], enrolled: Math.min(slots[idx].enrolled + 1, MAX_STUDENTS) }
    await saveSlots(slots, weekKey)
  }
  return rowToBooking(data)
}

// Creates a booking and bumps the slot's enrolled count. Capacity is enforced
// by a single conditional UPDATE in Postgres (adjust_enrolled), so two
// parallel requests can never both take the last seat.
export async function createBooking(booking: NewBooking): Promise<Booking> {
  const weekKey = booking.weekKey ?? ''
  const db = getSupabaseAdmin()

  const slots = await ensureWeekSlots(weekKey)
  const slot = slots.find((s) => s.id === booking.slotId)
  if (!slot) throw new SlotNotFoundError('Unknown slot')
  if (isSlotInPast(slot, weekKey)) throw new SlotPastError('Slot already started')

  // Take the seat first — atomically. false means the slot filled up between
  // the page load and the submit.
  const { data: seatTaken, error: rpcError } = await db.rpc('adjust_enrolled', {
    p_slot_id: booking.slotId,
    p_week_key: weekKey,
    p_delta: 1,
    p_max: MAX_STUDENTS,
  })
  if (rpcError) {
    console.warn('adjust_enrolled() missing — run supabase-schema.sql. Using legacy path.', rpcError.message)
    return createBookingLegacy(booking, weekKey)
  }
  if (!seatTaken) throw new SlotFullError('Slot is full')

  const { data, error } = await db.from('bookings').insert(bookingRow(booking)).select().single()
  if (error || !data) {
    // Release the seat we just took (best effort).
    await db.rpc('adjust_enrolled', {
      p_slot_id: booking.slotId, p_week_key: weekKey, p_delta: -1, p_max: MAX_STUDENTS,
    })
    throw new Error('Failed to save booking')
  }
  return rowToBooking(data)
}

// Lets an admin register a student directly, without going through the
// public booking form — only studentName is required, everything else
// defaults to '' (or the slot's own group) and is filled in later if needed.
// Reuses createBooking so capacity/seat-taking stays capacity-safe.
export type NewAdminBooking = {
  slotId: string
  weekKey: string
  slotLabel?: string
  studentName: string
  parentName?: string
  phone?: string
  grade?: string
  groupPreference?: GroupType
}

export async function createBookingAsAdmin(input: NewAdminBooking): Promise<Booking> {
  const slots = await getSlots(input.weekKey)
  const slot = slots.find((s) => s.id === input.slotId)
  const fallbackGroup: GroupType = slot && slot.groupType !== 'empty' ? slot.groupType : 'middle-school'
  return createBooking({
    slotId: input.slotId,
    weekKey: input.weekKey,
    slotLabel: input.slotLabel ?? '',
    studentName: input.studentName,
    parentName: input.parentName ?? '',
    phone: input.phone ?? '',
    grade: input.grade ?? '',
    groupPreference: input.groupPreference ?? fallbackGroup,
  })
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
  const db = getSupabaseAdmin()
  // Look up slot/week before deleting — the row (and its slot_id/week_key) is
  // gone once the delete succeeds.
  const { data: booking } = await db
    .from('bookings').select('slot_id, week_key').eq('id', id).single()

  await db.from('bookings').delete().eq('id', id)

  if (booking) {
    // Release the seat (best effort) — mirrors the fallback style in createBooking.
    const { error } = await db.rpc('adjust_enrolled', {
      p_slot_id: booking.slot_id, p_week_key: booking.week_key ?? '', p_delta: -1, p_max: MAX_STUDENTS,
    })
    if (error) {
      console.warn('adjust_enrolled() missing on delete — run supabase-schema.sql.', error.message)
    }
  }
}
