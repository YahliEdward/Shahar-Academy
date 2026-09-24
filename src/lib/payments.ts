// Payment tracking: who owes for which lessons, month by month (the teacher
// bills roughly once a month). A pure derivation over the already-loaded
// bookings, like reports.ts — there is no students table, so a student is
// everyone booked under the same name.
import { Booking, TEMPLATE_KEY } from './types'
import { isBillable, groupSizes, effectivePrice, lessonStart, monthKeyOf, monthLabel } from './reports'

// True once the database has the paid_at column. Before the migration no row
// carries the field at all, and every past lesson would otherwise read as owed.
export function paymentsEnabled(bookings: Booking[]): boolean {
  return bookings.length === 0 || bookings.some((b) => b.paidAt !== undefined)
}

export interface StudentLesson {
  booking: Booking
  start: Date
  price: number
  paid: boolean
  happened: boolean
  // Happened and not paid. An upcoming lesson isn't due yet.
  owed: boolean
}

export interface StudentMonth {
  monthKey: string
  label: string
  // Oldest first — the order they're listed in on a bill.
  lessons: StudentLesson[]
  total: number
  paid: number
  owed: number
  // Not paid and hasn't happened yet.
  upcoming: number
}

export interface StudentAccount {
  name: string
  phone: string
  parentName: string
  grade: string
  // Recurring enrollments (the "לוח קבוע" master rows).
  standing: Booking[]
  // Newest month first.
  months: StudentMonth[]
  owedTotal: number
  nextLesson: StudentLesson | null
  lastLesson: StudentLesson | null
}

const normalizeName = (s: string) => s.trim().replace(/\s+/g, ' ')

const sum = (lessons: StudentLesson[]) => lessons.reduce((total, l) => total + l.price, 0)

// What the student still owes from months before `monthKey`.
export function owedBefore(account: StudentAccount, monthKey: string): number {
  return account.months.filter((m) => m.monthKey < monthKey).reduce((total, m) => total + m.owed, 0)
}

export function buildStudentAccounts(bookings: Booking[], now = new Date()): StudentAccount[] {
  const enabled = paymentsEnabled(bookings)
  const sizes = groupSizes(bookings)
  const byName = new Map<string, Booking[]>()
  for (const b of bookings) {
    if (b.status !== 'confirmed') continue
    const name = normalizeName(b.studentName)
    if (!name) continue
    byName.set(name, [...(byName.get(name) ?? []), b])
  }

  const accounts: StudentAccount[] = []
  for (const [name, rows] of byName) {
    // Contact details from the most recent row that has them.
    const newest = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const pick = (field: 'phone' | 'parentName' | 'grade') => newest.find((b) => b[field]?.trim())?.[field] ?? ''

    const lessons: StudentLesson[] = []
    for (const b of rows) {
      const start = lessonStart(b)
      if (!start || !isBillable(b)) continue
      const happened = start.getTime() <= now.getTime()
      const paid = Boolean(b.paidAt)
      lessons.push({ booking: b, start, price: effectivePrice(b, sizes), paid, happened, owed: enabled && happened && !paid })
    }
    lessons.sort((a, b) => a.start.getTime() - b.start.getTime())

    const byMonth = new Map<string, StudentLesson[]>()
    for (const l of lessons) {
      const key = monthKeyOf(l.start)
      byMonth.set(key, [...(byMonth.get(key) ?? []), l])
    }
    const months: StudentMonth[] = [...byMonth.entries()]
      .map(([monthKey, list]) => ({
        monthKey,
        label: monthLabel(monthKey),
        lessons: list,
        total: sum(list),
        paid: sum(list.filter((l) => l.paid)),
        owed: sum(list.filter((l) => l.owed)),
        upcoming: sum(list.filter((l) => !l.happened && !l.paid)),
      }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey))

    const happened = lessons.filter((l) => l.happened)
    accounts.push({
      name,
      phone: pick('phone'),
      parentName: pick('parentName'),
      grade: pick('grade'),
      standing: rows.filter((b) => b.weekKey === TEMPLATE_KEY),
      months,
      owedTotal: months.reduce((total, m) => total + m.owed, 0),
      nextLesson: lessons.find((l) => !l.happened) ?? null,
      lastLesson: happened[happened.length - 1] ?? null,
    })
  }
  return accounts
}
