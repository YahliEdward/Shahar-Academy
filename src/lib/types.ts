import { getSupabase } from './supabase'

export type GroupType = 'middle-school' | 'high-4' | 'high-5' | 'mixed' | 'empty'
export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Slot {
  id: string
  day: DayIndex
  time: string
  endTime: string
  groupType: GroupType
  enrolled: number
}

export interface Booking {
  id: string
  slotId: string
  weekKey?: string
  slotLabel?: string
  studentName: string
  parentName: string
  phone: string
  grade: string
  groupPreference: string
  status: 'pending' | 'confirmed'
  price?: number | null
  createdAt: string
  // Set only on week-level clones of a standing (recurring) student: points
  // back to the master booking (weekKey === TEMPLATE_KEY) it was cloned from.
  templateId?: string
}

// A record of one "ייצוא לאקסל" click on the reports tab — the literal
// generated file, not a live recompute. Summary is the list/history view (no
// file bytes); Record additionally carries the base64 file for download.
export interface ReportExportSummary {
  id: string
  createdAt: string
  filename: string
  grandTotal: number
  lessonCount: number
  byteSize: number
}

export interface ReportExportRecord extends ReportExportSummary {
  fileBase64: string
}

export const MAX_STUDENTS = 6

export const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'] as const

// Friday (ערב שבת) is a short pre-Shabbat day that often has no lessons at
// all, so — unlike the fixed Sun–Thu days — it's allowed to drop to zero
// scheduled hours instead of always keeping at least one.
export const FRIDAY_DAY = 5 as const

// Motzash (מוצ״ש — Saturday night) is an optional day: not part of the fixed
// DAYS list or the default template, only shown once slots exist for it.
export const MOTZASH_DAY = 6 as const
export const MOTZASH_LABEL = 'מוצ״ש'

export function dayLabel(day: DayIndex): string {
  return day === MOTZASH_DAY ? MOTZASH_LABEL : DAYS[day]
}

export const DEFAULT_TIMES: { time: string; endTime: string }[] = [
  { time: '14:00', endTime: '15:00' },
  { time: '15:00', endTime: '16:00' },
  { time: '16:00', endTime: '17:00' },
  { time: '17:00', endTime: '18:00' },
  { time: '18:00', endTime: '19:00' },
  { time: '19:00', endTime: '20:00' },
]

export const GROUP_LABELS: Record<GroupType, string> = {
  'middle-school': 'חטיבת ביניים',
  'high-4': 'תיכון — 4 יח\'',
  'high-5': 'תיכון — 5 יח\'',
  'mixed': 'קבוצה מעורבת',
  'empty': 'פנוי',
}

// Compact chip/badge styling per group type (used on the public schedule and
// in the admin dashboard).
export const GROUP_BADGE: Record<GroupType, string> = {
  'middle-school': 'bg-blue-50 text-blue-700 border border-blue-200',
  'high-4': 'bg-purple-50 text-purple-700 border border-purple-200',
  'high-5': 'bg-amber-50 text-amber-700 border border-amber-200',
  'mixed': 'bg-green-50 text-green-700 border border-green-200',
  'empty': 'bg-slate-50 text-slate-400 border border-slate-200',
}

export const GROUP_COLORS: Record<GroupType, string> = {
  'middle-school': 'bg-blue-50 border-blue-300',
  'high-4': 'bg-purple-50 border-purple-300',
  'high-5': 'bg-amber-50 border-amber-300',
  'mixed': 'bg-green-50 border-green-300',
  'empty': 'bg-white border-slate-200',
}

// True when a week-scoped booking is a clone of a standing/fixed student
// (templateId points back to its template master). Only meaningful for real
// week bookings — template master rows are fixed by definition.
export function isFixedBooking(b: Booking): boolean {
  return Boolean(b.templateId)
}

export const ORIGIN_BADGE = {
  fixed: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  oneTime: 'bg-orange-50 text-orange-700 border border-orange-200',
}

export const ORIGIN_LABEL = {
  fixed: 'קבוע',
  oneTime: 'חד פעמי',
}

// ─── Week utilities ───────────────────────────────────────────────────────────

export function getWeekStart(offsetWeeks: number): Date {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const sunday = new Date(now)
  sunday.setDate(now.getDate() - dayOfWeek + offsetWeeks * 7)
  sunday.setHours(0, 0, 0, 0)
  return sunday
}

// Local-date key (YYYY-MM-DD). Deliberately NOT toISOString(): that converts to
// UTC, which in Israel rolls Sunday 00:00 back to Saturday's date and produces
// different keys for users in different timezones.
export function getWeekKey(offsetWeeks: number): string {
  const d = getWeekStart(offsetWeeks)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export function getWeekDates(offsetWeeks: number): Date[] {
  const sunday = getWeekStart(offsetWeeks)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return d
  })
}

export function formatShortDate(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}`
}

export function formatPrice(price: number | null | undefined): string {
  if (price == null) return 'לא הוגדר'
  return new Intl.NumberFormat('he-IL', {
    style: 'currency', currency: 'ILS', maximumFractionDigits: 0,
  }).format(price)
}

// True when the slot's start time on its day of the given week is already gone.
export function isSlotPast(slot: Slot, weekDates: Date[]): boolean {
  const day = weekDates[slot.day]
  if (!day) return false
  const [h, m] = slot.time.split(':').map(Number)
  const start = new Date(day)
  start.setHours(h || 0, m || 0, 0, 0)
  return start.getTime() < Date.now()
}

// ─── Slot helpers ─────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function buildDefaultSlots(): Slot[] {
  const slots: Slot[] = []
  for (let d = 0; d < 6; d++) {
    for (let t = 0; t < DEFAULT_TIMES.length; t++) {
      slots.push({
        id: `slot-${d}-${t}`,
        day: d as DayIndex,
        time: DEFAULT_TIMES[t].time,
        endTime: DEFAULT_TIMES[t].endTime,
        groupType: 'empty',
        enrolled: 0,
      })
    }
  }
  return slots
}

export function rowToSlot(row: Record<string, unknown>): Slot {
  return {
    id: row.id as string,
    day: row.day as DayIndex,
    time: row.time as string,
    endTime: row.end_time as string,
    groupType: row.group_type as GroupType,
    enrolled: row.enrolled as number,
  }
}

export function rowToBooking(row: Record<string, unknown>): Booking {
  return {
    id: row.id as string,
    slotId: row.slot_id as string,
    weekKey: row.week_key as string | undefined,
    slotLabel: row.slot_label as string | undefined,
    studentName: row.student_name as string,
    parentName: row.parent_name as string,
    phone: row.phone as string,
    grade: row.grade as string,
    groupPreference: row.group_preference as string,
    status: row.status as 'pending' | 'confirmed',
    price: row.price == null ? null : Number(row.price),
    createdAt: row.created_at as string,
    templateId: row.template_id as string | undefined,
  }
}

export function rowToReportExportSummary(row: Record<string, unknown>): ReportExportSummary {
  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    filename: row.filename as string,
    grandTotal: Number(row.grand_total),
    lessonCount: Number(row.lesson_count),
    byteSize: Number(row.byte_size),
  }
}

export function rowToReportExportRecord(row: Record<string, unknown>): ReportExportRecord {
  return {
    ...rowToReportExportSummary(row),
    fileBase64: row.file_base64 as string,
  }
}

// ─── Slot storage ─────────────────────────────────────────────────────────────

export const TEMPLATE_KEY = 'template'

// Deterministic id for a slot derived from the default schedule, so bookings
// that reference it stay stable across reloads.
export function templateSlotId(day: number, time: string): string {
  return `slot-${day}-${time.replace(':', '')}`
}

export async function getSlots(weekKey: string): Promise<Slot[]> {
  // A week either has its own override rows, or it follows the default schedule.
  const { data: weekRows } = await getSupabase()
    .from('slots')
    .select('*')
    .eq('week_key', weekKey)
    .order('day')
    .order('time')

  if (weekRows && weekRows.length > 0) return weekRows.map(rowToSlot)

  // No override → follow the default (template).
  return getTemplate()
}

// The default weekly schedule. Falls back to a blank 14:00–20:00 grid until the
// teacher has saved one.
export async function getTemplate(): Promise<Slot[]> {
  const { data } = await getSupabase()
    .from('slots')
    .select('*')
    .eq('week_key', TEMPLATE_KEY)
    .order('day')
    .order('time')

  if (data && data.length > 0) {
    // Two template rows at the same day+time remap to the same id — keep only
    // the first so a duplicated row can't render the same hour twice.
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

// NOTE: Writing slots/templates and all booking access now happen server-side
// via src/lib/serverDb.ts and the /api routes, so the anon client (which is
// blocked by Row Level Security) is only used here for public *reads* of the
// schedule (getSlots / getTemplate above).

export function addSlotToDay(slots: Slot[], day: DayIndex): Slot[] {
  const daySlots = slots.filter((s) => s.day === day)
  const last = daySlots[daySlots.length - 1]
  let newTime = '22:00'
  let newEndTime = '23:30'
  if (last) {
    const [h, m] = last.endTime.split(':').map(Number)
    const endMinutes = h * 60 + m + 90
    const nh = Math.floor(endMinutes / 60)
    const nm = endMinutes % 60
    newTime = last.endTime
    newEndTime = `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
  }
  return [...slots, {
    id: `slot-${day}-extra-${generateId()}`,
    day,
    time: newTime,
    endTime: newEndTime,
    groupType: 'empty',
    enrolled: 0,
  }]
}

export function removeSlot(slots: Slot[], id: string): Slot[] {
  return slots.filter((s) => s.id !== id)
}
