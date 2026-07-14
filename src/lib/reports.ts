// Revenue reporting: a pure aggregation over already-loaded bookings, no DB
// access of its own. Prices are per-lesson (a student can be charged
// differently for different lessons in the same month — a weekday rate, a
// one-time discount, etc.), so every total here is a plain sum of each
// billable row's own price — never a rate multiplied by a lesson count.
import { Booking, TEMPLATE_KEY, formatPrice } from './types'

export interface MonthTotal {
  monthKey: string
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

// Only confirmed lessons with a price count as revenue. Master standing rows
// (week_key === TEMPLATE_KEY) are the recurring *definition*, not a real
// billable week — counting them would double-count a standing student (once
// on the master, again on every weekly clone) and they have no real calendar
// month to attribute to anyway.
function isBillable(b: Booking): boolean {
  return b.status === 'confirmed' && b.price != null && !!b.weekKey && b.weekKey !== TEMPLATE_KEY
}

export function buildReport(bookings: Booking[]): ReportData {
  const byMonthMap = new Map<string, number>()
  const byStudentMap = new Map<string, { total: number; lessonCount: number }>()
  let grandTotal = 0

  for (const b of bookings) {
    if (!isBillable(b)) continue
    const price = b.price as number
    grandTotal += price

    const monthKey = monthKeyFromWeekKey(b.weekKey as string)
    if (monthKey) byMonthMap.set(monthKey, (byMonthMap.get(monthKey) ?? 0) + price)

    // Grouped by studentName only — this app has no separate student-id
    // entity anywhere else either.
    const key = b.studentName || '(ללא שם)'
    const existing = byStudentMap.get(key) ?? { total: 0, lessonCount: 0 }
    byStudentMap.set(key, { total: existing.total + price, lessonCount: existing.lessonCount + 1 })
  }

  const byMonth = [...byMonthMap.entries()]
    .map(([monthKey, total]) => ({ monthKey, label: monthLabel(monthKey), total }))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey))

  const byStudent = [...byStudentMap.entries()]
    .map(([studentName, v]) => ({ studentName, total: v.total, lessonCount: v.lessonCount }))
    .sort((a, b) => b.total - a.total)

  return { byMonth, byStudent, grandTotal }
}

export { formatPrice }
