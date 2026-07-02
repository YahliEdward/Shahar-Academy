import { supabase } from './supabase'

export type GroupType = 'middle-school' | 'high-4' | 'high-5' | 'mixed' | 'empty'
export type DayIndex = 0 | 1 | 2 | 3 | 4

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
  groupPreference: GroupType
  status: 'pending' | 'confirmed'
  price?: string
  createdAt: string
}

export const MAX_STUDENTS = 6

export const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'] as const

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

export const GROUP_COLORS: Record<GroupType, string> = {
  'middle-school': 'bg-blue-900/40 border-blue-500/40',
  'high-4': 'bg-purple-900/40 border-purple-500/40',
  'high-5': 'bg-yellow-900/40 border-yellow-500/40',
  'mixed': 'bg-green-900/40 border-green-500/40',
  'empty': 'bg-zinc-800/40 border-zinc-600/40',
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
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return d
  })
}

export function formatShortDate(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}`
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
  for (let d = 0; d < 5; d++) {
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
    groupPreference: row.group_preference as GroupType,
    status: row.status as 'pending' | 'confirmed',
    price: row.price as string | undefined,
    createdAt: row.created_at as string,
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
  const { data: weekRows } = await supabase
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
  const { data } = await supabase
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
