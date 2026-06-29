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

export function getWeekKey(offsetWeeks: number): string {
  return getWeekStart(offsetWeeks).toISOString().split('T')[0]
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

// ─── Slot helpers ─────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function buildDefaultSlots(): Slot[] {
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

function rowToSlot(row: Record<string, unknown>): Slot {
  return {
    id: row.id as string,
    day: row.day as DayIndex,
    time: row.time as string,
    endTime: row.end_time as string,
    groupType: row.group_type as GroupType,
    enrolled: row.enrolled as number,
  }
}

function rowToBooking(row: Record<string, unknown>): Booking {
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

export async function getSlots(weekKey: string): Promise<Slot[]> {
  const { data, error } = await supabase
    .from('slots')
    .select('*')
    .eq('week_key', weekKey)
    .order('day')
    .order('time')

  if (error || !data || data.length === 0) {
    return buildDefaultSlots()
  }
  return data.map(rowToSlot)
}

export async function saveSlots(slots: Slot[], weekKey: string): Promise<void> {
  await supabase.from('slots').delete().eq('week_key', weekKey)
  if (slots.length === 0) return
  const rows = slots.map((s) => ({
    id: s.id,
    day: s.day,
    time: s.time,
    end_time: s.endTime,
    group_type: s.groupType,
    enrolled: s.enrolled,
    week_key: weekKey,
  }))
  await supabase.from('slots').insert(rows)
}

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

// ─── Booking storage ──────────────────────────────────────────────────────────

export async function getBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data.map(rowToBooking)
}

export async function saveBooking(booking: Omit<Booking, 'id' | 'createdAt'>): Promise<Booking> {
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
    status: booking.status,
    price: booking.price,
    created_at: new Date().toISOString(),
  }
  const { data, error } = await supabase.from('bookings').insert(row).select().single()
  if (error || !data) throw new Error('Failed to save booking')
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
  await supabase.from('bookings').update(row).eq('id', id)
}

export async function deleteBooking(id: string): Promise<void> {
  await supabase.from('bookings').delete().eq('id', id)
}
