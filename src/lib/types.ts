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
  const dayOfWeek = now.getDay() // 0 = Sunday
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

// ─── Slot storage ─────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function buildDefaultSlots(): Slot[] {
  const slots: Slot[] = []
  const defaultGroups: GroupType[][] = [
    ['middle-school', 'high-4', 'high-5', 'mixed', 'empty', 'empty'],
    ['high-5', 'middle-school', 'high-4', 'mixed', 'empty', 'empty'],
    ['high-4', 'high-5', 'mixed', 'middle-school', 'empty', 'empty'],
    ['mixed', 'high-4', 'high-5', 'middle-school', 'empty', 'empty'],
    ['high-5', 'mixed', 'middle-school', 'high-4', 'empty', 'empty'],
  ]
  const defaultEnrolled = [
    [4, 6, 2, 1, 0, 0],
    [3, 5, 6, 0, 0, 0],
    [6, 2, 4, 1, 0, 0],
    [5, 3, 1, 4, 0, 0],
    [2, 6, 3, 5, 0, 0],
  ]
  for (let d = 0; d < 5; d++) {
    for (let t = 0; t < DEFAULT_TIMES.length; t++) {
      slots.push({
        id: `slot-${d}-${t}`,
        day: d as DayIndex,
        time: DEFAULT_TIMES[t].time,
        endTime: DEFAULT_TIMES[t].endTime,
        groupType: defaultGroups[d][t],
        enrolled: defaultEnrolled[d][t],
      })
    }
  }
  return slots
}

export function getSlots(weekKey: string): Slot[] {
  if (typeof window === 'undefined') return buildDefaultSlots()
  const key = `sha_slots_${weekKey}`
  const stored = localStorage.getItem(key)
  if (!stored) {
    const defaults = buildDefaultSlots()
    localStorage.setItem(key, JSON.stringify(defaults))
    return defaults
  }
  return JSON.parse(stored) as Slot[]
}

export function saveSlots(slots: Slot[], weekKey: string): void {
  localStorage.setItem(`sha_slots_${weekKey}`, JSON.stringify(slots))
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
  const newSlot: Slot = {
    id: `slot-${day}-extra-${generateId()}`,
    day,
    time: newTime,
    endTime: newEndTime,
    groupType: 'empty',
    enrolled: 0,
  }
  return [...slots, newSlot]
}

export function removeSlot(slots: Slot[], id: string): Slot[] {
  return slots.filter((s) => s.id !== id)
}

// ─── Booking storage ──────────────────────────────────────────────────────────

export function getBookings(): Booking[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem('sha_bookings')
  return stored ? (JSON.parse(stored) as Booking[]) : []
}

export function saveBooking(booking: Omit<Booking, 'id' | 'createdAt'>): Booking {
  const bookings = getBookings()
  const newBooking: Booking = {
    ...booking,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }
  bookings.push(newBooking)
  localStorage.setItem('sha_bookings', JSON.stringify(bookings))
  return newBooking
}

export function updateBooking(id: string, updates: Partial<Booking>): void {
  const bookings = getBookings()
  const idx = bookings.findIndex((b) => b.id === id)
  if (idx !== -1) {
    bookings[idx] = { ...bookings[idx], ...updates }
    localStorage.setItem('sha_bookings', JSON.stringify(bookings))
  }
}

export function deleteBooking(id: string): void {
  const bookings = getBookings().filter((b) => b.id !== id)
  localStorage.setItem('sha_bookings', JSON.stringify(bookings))
}
