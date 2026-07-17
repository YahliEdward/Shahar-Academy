import { getSupabaseAdmin } from './supabaseAdmin'
import {
  Slot, Booking, MAX_STUDENTS, TEMPLATE_KEY,
  rowToSlot, rowToBooking, templateSlotId, buildDefaultSlots,
  ReportExportSummary, ReportExportRecord, rowToReportExportSummary, rowToReportExportRecord,
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
    // Template ids are remapped to templateSlotId(day, time), so two rows at
    // the same day+time collapse into the same id. Keep only the first —
    // duplicates (e.g. left behind by interleaved saves) would otherwise
    // render the same hour twice, sharing the same students.
    const seen = new Set<string>()
    const slots: Slot[] = []
    for (const row of data) {
      const id = templateSlotId(row.day as number, row.time as string)
      if (seen.has(id)) continue
      seen.add(id)
      slots.push({ ...rowToSlot(row), id })
    }
    return slots
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

function slotsToRows(slots: Slot[], weekKey: string, isOverride: boolean) {
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
    is_override: isOverride,
  }))
}

// Insert payload for databases that predate the is_override column.
function withoutOverrideColumn(rows: ReturnType<typeof slotsToRows>) {
  return rows.map((row) => {
    const legacy: Record<string, unknown> = { ...row }
    delete legacy.is_override
    return legacy
  })
}

// Template rows get random ids, so unlike week rows the (id, week_key) primary
// key can't reject two rows at the same day+time — and getTemplate() would then
// render that hour twice. Drop such duplicates before persisting.
function dedupeTemplateSlots(slots: Slot[]): Slot[] {
  const seen = new Set<string>()
  return slots.filter((s) => {
    const key = `${s.day}-${s.time}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// isOverride marks the week as deliberately edited by the admin ("שבוע
// ספציפי" mode), which excludes it from template propagation. Weeks
// materialised automatically (by a booking or an enrolled adjustment) save
// with false so they keep following the template.
export async function saveSlots(slots: Slot[], weekKey: string, isOverride = false): Promise<void> {
  const db = getSupabaseAdmin()
  const toSave = weekKey === TEMPLATE_KEY ? dedupeTemplateSlots(slots) : slots
  const { error: deleteError } = await db.from('slots').delete().eq('week_key', weekKey)
  if (deleteError) throw new Error(`Failed to clear slots for ${weekKey}: ${deleteError.message}`)
  if (toSave.length === 0) return
  const rows = slotsToRows(toSave, weekKey, isOverride && weekKey !== TEMPLATE_KEY)
  let { error: insertError } = await db.from('slots').insert(rows)
  if (insertError && insertError.message.includes('is_override')) {
    // Column not migrated yet — run supabase-schema.sql. Save without the flag.
    console.warn('is_override column missing — run supabase-schema.sql.', insertError.message)
    ;({ error: insertError } = await db.from('slots').insert(withoutOverrideColumn(rows)))
  }
  if (insertError) throw new Error(`Failed to save slots for ${weekKey}: ${insertError.message}`)
}

// Sunday of the current week in Israel time (YYYY-MM-DD) — mirrors the
// client's getWeekKey(0) regardless of the serverless region's timezone.
function currentWeekKey(): string {
  const israelToday = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jerusalem' })
    .format(new Date())
  const d = new Date(`${israelToday}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - d.getUTCDay())
  return d.toISOString().slice(0, 10)
}

// Re-syncs every current/future week that still follows the template (no
// is_override row) with the new template, keeping each slot's real enrolled
// count. Without this, the snapshot a booking took of the old template would
// freeze the week and silently swallow later template edits.
async function propagateTemplateToFollowerWeeks(template: Slot[]): Promise<void> {
  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('slots')
    .select('week_key, is_override')
    .neq('week_key', TEMPLATE_KEY)
    .gte('week_key', currentWeekKey())
  if (error) {
    // is_override column missing — run supabase-schema.sql. Until then,
    // materialised weeks keep their old snapshot.
    console.warn('Template propagation skipped — run supabase-schema.sql.', error.message)
    return
  }

  const weeks = new Map<string, boolean>()
  for (const row of data ?? []) {
    const key = row.week_key as string
    weeks.set(key, (weeks.get(key) ?? false) || Boolean(row.is_override))
  }

  for (const [weekKey, hasOverride] of weeks) {
    if (hasOverride) continue
    const { data: rows } = await db
      .from('slots').select('id, enrolled').eq('week_key', weekKey)
    const enrolledById = new Map((rows ?? []).map((r) => [r.id as string, r.enrolled as number]))
    const fresh = template.map((s) => ({
      ...s,
      // Canonical week ids, same as a booking materialisation would produce.
      id: templateSlotId(s.day, s.time),
      // Keep the seats already taken this week. s.id first: a slot whose time
      // was just edited still carries its old id, so its students follow it.
      enrolled: enrolledById.get(s.id) ?? enrolledById.get(templateSlotId(s.day, s.time)) ?? 0,
    }))
    await saveSlots(fresh, weekKey, false)
  }
}

export async function saveTemplate(slots: Slot[]): Promise<void> {
  // The template never holds real seats — enrolled counts live on week rows.
  // Anything else materialises as phantom students in fresh weeks.
  const template = dedupeTemplateSlots(slots).map((s) => ({ ...s, enrolled: 0 }))
  await saveSlots(template, TEMPLATE_KEY)
  await propagateTemplateToFollowerWeeks(template)
  // A slot that just reappeared (or changed shape) should pick its standing
  // roster back up rather than waiting for the next add/remove.
  await syncStandingBookings()
}

export async function weekHasOverride(weekKey: string): Promise<boolean> {
  const db = getSupabaseAdmin()
  const { count, error } = await db
    .from('slots')
    .select('*', { count: 'exact', head: true })
    .eq('week_key', weekKey)
    .eq('is_override', true)
  if (error) {
    // is_override column missing — legacy semantics: any rows are an override.
    const { count: legacyCount } = await db
      .from('slots')
      .select('*', { count: 'exact', head: true })
      .eq('week_key', weekKey)
    return (legacyCount ?? 0) > 0
  }
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

// status defaults to 'pending' (public requests await approval); admin-created
// bookings pass 'confirmed' explicitly.
export type NewBooking = Omit<Booking, 'id' | 'createdAt' | 'status'> & { status?: Booking['status'] }

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

  // A fresh week starts with zero seats taken — enrolled counts real bookings
  // in that week, never leftovers stored on the template.
  const template = (await getTemplate()).map((s) => ({ ...s, enrolled: 0 }))
  const rows = slotsToRows(template, weekKey, false)
  let { error } = await db.from('slots').insert(rows)
  if (error && error.message.includes('is_override')) {
    console.warn('is_override column missing — run supabase-schema.sql.', error.message)
    ;({ error } = await db.from('slots').insert(withoutOverrideColumn(rows)))
  }
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

// Bumps a single slot's enrolled count for a week — through the atomic
// adjust_enrolled() UPDATE — without rewriting the week's schedule, so a week
// that follows the template keeps following it. Returns false when the slot
// is already full.
export async function adjustSlotEnrolled(weekKey: string, slotId: string, delta: number): Promise<boolean> {
  const db = getSupabaseAdmin()
  const slots = await ensureWeekSlots(weekKey)
  if (!slots.some((s) => s.id === slotId)) throw new SlotNotFoundError('Unknown slot')

  const { data: applied, error } = await db.rpc('adjust_enrolled', {
    p_slot_id: slotId, p_week_key: weekKey, p_delta: delta, p_max: MAX_STUDENTS,
  })
  if (error) {
    console.warn('adjust_enrolled() missing — run supabase-schema.sql. Using legacy path.', error.message)
    const updated = slots.map((s) =>
      s.id === slotId
        ? { ...s, enrolled: Math.max(0, Math.min(MAX_STUDENTS, s.enrolled + delta)) }
        : s
    )
    await saveSlots(updated, weekKey, await weekHasOverride(weekKey))
    return true
  }
  return Boolean(applied)
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
    status: booking.status ?? 'pending',
    price: booking.price,
    created_at: new Date().toISOString(),
    template_id: booking.templateId,
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
    // Keep the week's override status — a booking must not flip it either way.
    await saveSlots(slots, weekKey, await weekHasOverride(weekKey))
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
// The booking is confirmed immediately: an admin adding a student is the
// approval, so it must not land in the pending-requests queue.
// Reuses createBooking so capacity/seat-taking stays capacity-safe.
export type NewAdminBooking = {
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

export async function createBookingAsAdmin(input: NewAdminBooking): Promise<Booking> {
  return createBooking({
    slotId: input.slotId,
    weekKey: input.weekKey,
    slotLabel: input.slotLabel ?? '',
    studentName: input.studentName,
    parentName: input.parentName ?? '',
    phone: input.phone ?? '',
    grade: input.grade ?? '',
    groupPreference: input.groupPreference ?? '',
    status: 'confirmed',
    price: input.price ?? null,
  })
}

// ─── Standing (recurring) students ──────────────────────────────────────────
// A student added while managing "לוח קבוע" is a standing enrollment: one
// master booking (week_key === TEMPLATE_KEY) cloned into every week within
// the admin/public browsable range (this week + the next few, matching
// ScheduleTab/ScheduleGrid's MAX_WEEK_OFFSET), so it shows up automatically
// every week without being re-added. A clone's template_id points back to its
// master row, which is how removal finds every clone to delete.

const STANDING_WEEK_RANGE = 4 // this week + 3 ahead

export async function getStandingBookings(): Promise<Booking[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('bookings')
    .select('*')
    .eq('week_key', TEMPLATE_KEY)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data.map(rowToBooking)
}

function followerWeekKeys(): string[] {
  const base = new Date(`${currentWeekKey()}T00:00:00Z`)
  return Array.from({ length: STANDING_WEEK_RANGE }, (_, i) => {
    const d = new Date(base)
    d.setUTCDate(d.getUTCDate() + i * 7)
    return d.toISOString().slice(0, 10)
  })
}

// Clones the given standing bookings into one week — skipping any that
// already have a clone there, whose slot doesn't exist that week, or whose
// slot is already full. Best-effort per student: one full slot doesn't stop
// the rest of the roster from syncing.
async function syncStandingBookingsIntoWeek(weekKey: string, standing: Booking[]): Promise<void> {
  if (standing.length === 0) return
  const db = getSupabaseAdmin()
  const slots = await ensureWeekSlots(weekKey)
  const { data: weekRows } = await db.from('bookings').select('template_id').eq('week_key', weekKey)
  const alreadyCloned = new Set((weekRows ?? []).map((r) => r.template_id as string).filter(Boolean))

  for (const master of standing) {
    if (alreadyCloned.has(master.id)) continue
    if (!slots.some((s) => s.id === master.slotId)) continue
    const { data: seatTaken } = await db.rpc('adjust_enrolled', {
      p_slot_id: master.slotId, p_week_key: weekKey, p_delta: 1, p_max: MAX_STUDENTS,
    })
    if (!seatTaken) continue
    // The alreadyCloned check above is only a fast path, not a guarantee —
    // an overlapping sync (React's dev-mode double effect, two admin tabs)
    // can race past it before either has committed. The unique index on
    // (template_id, week_key) is the real guard: if this insert loses the
    // race, release the seat we just took instead of double-booking it.
    const { error: insertError } = await db.from('bookings').insert(bookingRow({
      slotId: master.slotId,
      weekKey,
      slotLabel: master.slotLabel,
      studentName: master.studentName,
      parentName: master.parentName,
      phone: master.phone,
      grade: master.grade,
      groupPreference: master.groupPreference,
      status: 'confirmed',
      templateId: master.id,
      // Starting default for a week that didn't exist before — this lesson's
      // price can be edited independently afterward without affecting others.
      price: master.price,
    }))
    if (insertError) {
      await db.rpc('adjust_enrolled', {
        p_slot_id: master.slotId, p_week_key: weekKey, p_delta: -1, p_max: MAX_STUDENTS,
      })
    }
  }
}

// Re-syncs every standing student into every week in the browsable range.
// Called after the template's hours change (a slot that just reappeared
// should pick its roster back up) and opportunistically whenever the admin
// opens "לוח קבוע", so a week that just entered the range self-heals without
// needing a background job.
export async function syncStandingBookings(): Promise<void> {
  const standing = await getStandingBookings()
  if (standing.length === 0) return
  for (const weekKey of followerWeekKeys()) {
    await syncStandingBookingsIntoWeek(weekKey, standing)
  }
}

export async function createStandingBookingAsAdmin(input: NewAdminBooking): Promise<Booking> {
  const row = bookingRow({
    slotId: input.slotId,
    weekKey: TEMPLATE_KEY,
    slotLabel: input.slotLabel ?? '',
    studentName: input.studentName,
    parentName: input.parentName ?? '',
    phone: input.phone ?? '',
    grade: input.grade ?? '',
    groupPreference: input.groupPreference ?? '',
    status: 'confirmed',
    price: input.price ?? null,
  })
  const { data, error } = await getSupabaseAdmin().from('bookings').insert(row).select().single()
  if (error || !data) throw new Error('Failed to save standing booking')
  const master = rowToBooking(data)
  for (const weekKey of followerWeekKeys()) {
    await syncStandingBookingsIntoWeek(weekKey, [master])
  }
  return master
}

export async function isStandingBooking(id: string): Promise<boolean> {
  const { data } = await getSupabaseAdmin().from('bookings').select('week_key').eq('id', id).single()
  return data?.week_key === TEMPLATE_KEY
}

// Removes a standing student everywhere: the master row plus every week's
// clone, releasing each of those weeks' seats.
export async function removeStandingBooking(masterId: string): Promise<void> {
  const db = getSupabaseAdmin()
  const { data: clones } = await db.from('bookings').select('id, slot_id, week_key').eq('template_id', masterId)
  for (const clone of clones ?? []) {
    await db.from('bookings').delete().eq('id', clone.id as string)
    const { error } = await db.rpc('adjust_enrolled', {
      p_slot_id: clone.slot_id as string, p_week_key: clone.week_key as string, p_delta: -1, p_max: MAX_STUDENTS,
    })
    if (error) console.warn('adjust_enrolled() missing on standing removal — run supabase-schema.sql.', error.message)
  }
  await db.from('bookings').delete().eq('id', masterId)
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
  const { error } = await getSupabaseAdmin().from('bookings').update(row).eq('id', id)
  if (error) throw new Error(`Failed to update booking ${id}: ${error.message}`)
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

// ─── Report exports ─────────────────────────────────────────────────────────
// The literal generated .xlsx files from the reports tab's "ייצוא לאקסל"
// button — a permanent log, never recomputed. See supabase-schema.sql for why
// file_base64 is base64 text rather than bytea.

const REPORT_EXPORT_LIST_COLUMNS = 'id, created_at, filename, grand_total, lesson_count, byte_size'

export async function saveReportExport(input: {
  filename: string
  buffer: Buffer
  grandTotal: number
  lessonCount: number
}): Promise<ReportExportSummary> {
  const row = {
    id: generateId(),
    filename: input.filename,
    grand_total: input.grandTotal,
    lesson_count: input.lessonCount,
    byte_size: input.buffer.length,
    file_base64: input.buffer.toString('base64'),
  }
  const { data, error } = await getSupabaseAdmin()
    .from('report_exports').insert(row).select(REPORT_EXPORT_LIST_COLUMNS).single()
  if (error || !data) throw new Error(`Failed to save report export: ${error?.message}`)
  return rowToReportExportSummary(data)
}

export async function getReportExports(): Promise<ReportExportSummary[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('report_exports')
    .select(REPORT_EXPORT_LIST_COLUMNS)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data.map(rowToReportExportSummary)
}

export async function getReportExportById(id: string): Promise<ReportExportRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('report_exports').select('*').eq('id', id).single()
  if (error || !data) return null
  return rowToReportExportRecord(data)
}
