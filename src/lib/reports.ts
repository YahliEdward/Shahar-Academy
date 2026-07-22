// Revenue reporting: a pure aggregation over already-loaded bookings, no DB
// access of its own. Prices are per-lesson (a student can be charged
// differently for different lessons in the same month — a weekday rate, a
// one-time discount, etc.), so every total here is a plain sum of each
// billable row's own price — never a rate multiplied by a lesson count.
import { Booking, TEMPLATE_KEY, formatPrice, formatShortDate } from './types'

export interface MonthTotal {
  monthKey: string
  label: string
  total: number
}

export interface WeekTotal {
  weekKey: string
  year: number
  weekNumber: number
  label: string
  total: number
}

export interface StudentTotal {
  studentName: string
  total: number
  lessonCount: number
}

export interface ReportData {
  byMonth: MonthTotal[]
  byWeek: WeekTotal[]
  byStudent: StudentTotal[]
  grandTotal: number
}

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]

// week_key is the Sunday of the lesson's week (YYYY-MM-DD) — its calendar
// month is derived directly from that, not from created_at (when the row was
// created/cloned, which can be long before the week it bills).
function monthKeyFromWeekKey(weekKey: string): string | null {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(weekKey)
  return m ? `${m[1]}-${m[2]}` : null
}

function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  return `${HEBREW_MONTHS[m - 1]} ${y}`
}

// week_key is always a Sunday, so week 1 of a year is defined as the 7-day
// block starting on the Sunday on-or-before Jan 1 of that year — the offset
// between any week_key and that anchor is always an exact multiple of 7 days,
// so weekNumber is always a whole number >= 1 with no edge cases to handle.
function weekNumberFromWeekKey(weekKey: string): { year: number; weekNumber: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(weekKey)
  if (!m) return null
  const year = Number(m[1])
  // Date.UTC is used purely for day-count arithmetic (Y/M/D components only),
  // sidestepping Israel DST shifts that would corrupt a plain ms-diff between
  // local Dates.
  const weekSunday = Date.UTC(year, Number(m[2]) - 1, Number(m[3]))
  const jan1 = Date.UTC(year, 0, 1)
  const jan1Day = new Date(jan1).getUTCDay()
  const week1Sunday = jan1 - jan1Day * 86400000
  const weekNumber = Math.round((weekSunday - week1Sunday) / (7 * 86400000)) + 1
  return { year, weekNumber }
}

function weekLabel(weekKey: string, weekNumber: number): string {
  const [y, mo, d] = weekKey.split('-').map(Number)
  const sunday = new Date(y, mo - 1, d)
  const saturday = new Date(y, mo - 1, d + 6)
  return `שבוע ${weekNumber} (${formatShortDate(sunday)}–${formatShortDate(saturday)})`
}

// Only confirmed lessons with a price count as revenue. Master standing rows
// (week_key === TEMPLATE_KEY) are the recurring *definition*, not a real
// billable week — counting them would double-count a standing student (once
// on the master, again on every weekly clone) and they have no real calendar
// month to attribute to anyway.
export function isBillable(b: Booking): boolean {
  return b.status === 'confirmed' && b.price != null && !!b.weekKey && b.weekKey !== TEMPLATE_KEY
}

export function buildReport(bookings: Booking[]): ReportData {
  const byMonthMap = new Map<string, number>()
  const byWeekMap = new Map<string, number>()
  const byStudentMap = new Map<string, { total: number; lessonCount: number }>()
  let grandTotal = 0

  for (const b of bookings) {
    if (!isBillable(b)) continue
    const price = b.price as number
    grandTotal += price

    const weekKey = b.weekKey as string
    const monthKey = monthKeyFromWeekKey(weekKey)
    if (monthKey) byMonthMap.set(monthKey, (byMonthMap.get(monthKey) ?? 0) + price)
    byWeekMap.set(weekKey, (byWeekMap.get(weekKey) ?? 0) + price)

    // Grouped by studentName only — this app has no separate student-id
    // entity anywhere else either.
    const key = b.studentName || '(ללא שם)'
    const existing = byStudentMap.get(key) ?? { total: 0, lessonCount: 0 }
    byStudentMap.set(key, { total: existing.total + price, lessonCount: existing.lessonCount + 1 })
  }

  const byMonth = [...byMonthMap.entries()]
    .map(([monthKey, total]) => ({ monthKey, label: monthLabel(monthKey), total }))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey))

  const byWeek = [...byWeekMap.entries()]
    .map(([weekKey, total]) => {
      const info = weekNumberFromWeekKey(weekKey)
      return {
        weekKey,
        year: info?.year ?? 0,
        weekNumber: info?.weekNumber ?? 0,
        label: info ? weekLabel(weekKey, info.weekNumber) : weekKey,
        total,
      }
    })
    .sort((a, b) => b.weekKey.localeCompare(a.weekKey))

  const byStudent = [...byStudentMap.entries()]
    .map(([studentName, v]) => ({ studentName, total: v.total, lessonCount: v.lessonCount }))
    .sort((a, b) => b.total - a.total)

  return { byMonth, byWeek, byStudent, grandTotal }
}

export interface DetailRow {
  studentName: string
  monthLabel: string
  weekLabel: string
  slotLabel: string
  price: number
}

// One row per individual billable lesson — the "lesson breakdown" export
// sheet. Reuses isBillable so this can never disagree with buildReport's
// totals or with what's on screen.
export function buildDetailRows(bookings: Booking[]): DetailRow[] {
  return bookings
    .filter(isBillable)
    .map((b) => {
      const weekKey = b.weekKey as string
      const monthKey = monthKeyFromWeekKey(weekKey)
      const weekInfo = weekNumberFromWeekKey(weekKey)
      return {
        studentName: b.studentName || '(ללא שם)',
        monthLabel: monthKey ? monthLabel(monthKey) : weekKey,
        weekLabel: weekInfo ? `שבוע ${weekInfo.weekNumber}` : weekKey,
        slotLabel: b.slotLabel || '',
        price: b.price as number,
      }
    })
    .sort((a, b) =>
      a.monthLabel.localeCompare(b.monthLabel, 'he') ||
      a.studentName.localeCompare(b.studentName, 'he')
    )
}

export { formatPrice }
