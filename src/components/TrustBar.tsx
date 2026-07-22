import TrustBarCounters, { Stat } from './TrustBarCounters'
import { getBookings } from '@/lib/serverDb'
import { buildReport, countOpenSlots } from '@/lib/reports'
import { MAX_STUDENTS, getWeekKey, getSlots, Slot } from '@/lib/types'
import { STUDENTS_TAUGHT } from '@/lib/constants'

export default async function TrustBar() {
  const [bookings, slots] = await Promise.all([
    getBookings(),
    getSlots(getWeekKey(0)).catch((): Slot[] => []),
  ])

  const report = buildReport(bookings)
  const distinctStudents = report.byStudent.length
  const totalLessons = report.byStudent.reduce((sum, s) => sum + s.lessonCount, 0)
  const openSlots = countOpenSlots(slots)

  const stats: Stat[] = []

  if (distinctStudents > 0) {
    stats.push({ value: distinctStudents, label: 'תלמידים למדו איתנו' })
  }
  if (totalLessons > 0) {
    stats.push({ value: totalLessons, label: 'שיעורים שנקבעו' })
  }

  stats.push({ value: openSlots, label: 'מקומות פנויים השבוע' })
  stats.push({ value: STUDENTS_TAUGHT, suffix: '+', label: 'תלמידים שלמדו עם שחר בהצלחה' })
  stats.push({ value: MAX_STUDENTS, label: 'תלמידים מקסימום לקבוצה' })
  stats.push({ value: 0, label: 'מספר התלמידים שנשארו מאחור' })

  return (
    <section className="px-4 py-10 border-y border-slate-200">
      <TrustBarCounters stats={stats} />
    </section>
  )
}
