// Payment tracking: who owes for which lessons. A pure derivation over the
// already-loaded bookings, like reports.ts — there is no students table, so a
// student is everyone booked under the same name.
import { Booking, TEMPLATE_KEY } from './types'
import { isBillable, groupSizes, effectivePrice } from './reports'

// True once the database has the paid_at column. Before the migration no row
// carries the field at all, and every past lesson would otherwise read as owed.
export function paymentsEnabled(bookings: Booking[]): boolean {
  return bookings.length === 0 || bookings.some((b) => b.paidAt !== undefined)
}

// When a week's lesson starts, in local time: the week's Sunday plus the
// slot's day, at the slot's start time. A lesson whose slot is unknown falls
// back to the start of its week. Standing masters have no date.
export function lessonStart(b: Booking): Date | null {
  if (!b.weekKey || b.weekKey === TEMPLATE_KEY) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b.weekKey)
  if (!m) return null
  const [h, min] = (b.lessonTime ?? '00:00').split(':').map(Number)
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + (b.lessonDay ?? 0), h || 0, min || 0)
}

export interface StudentLesson {
  booking: Booking
  start: Date
  price: number
  happened: boolean
  owed: boolean
}

export interface StudentAccount {
  name: string
  phone: string
  parentName: string
  grade: string
  // Recurring enrollments (the "לוח קבוע" master rows).
  standing: Booking[]
  // Confirmed dated lessons, newest first.
  lessons: StudentLesson[]
  owed: StudentLesson[]
  owedTotal: number
  nextLesson: StudentLesson | null
}

const normalizeName = (s: string) => s.trim().replace(/\s+/g, ' ')

// One account per confirmed student. Only lessons that already happened can be
// owed — an upcoming lesson isn't due yet.
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
      lessons.push({
        booking: b,
        start,
        price: effectivePrice(b, sizes),
        happened,
        owed: enabled && happened && !b.paidAt,
      })
    }
    lessons.sort((a, b) => b.start.getTime() - a.start.getTime())
    const owed = lessons.filter((l) => l.owed)
    const upcoming = lessons.filter((l) => !l.happened)

    accounts.push({
      name,
      phone: pick('phone'),
      parentName: pick('parentName'),
      grade: pick('grade'),
      standing: rows.filter((b) => b.weekKey === TEMPLATE_KEY),
      lessons,
      owed,
      owedTotal: owed.reduce((sum, l) => sum + l.price, 0),
      nextLesson: upcoming[upcoming.length - 1] ?? null,
    })
  }
  return accounts
}
