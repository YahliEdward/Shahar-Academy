import TrustBarCounters, { Stat } from './TrustBarCounters'
import { getBookings, getApprovedTestimonials } from '@/lib/serverDb'
import { buildReport } from '@/lib/reports'
import { MAX_STUDENTS } from '@/lib/types'

export default async function TrustBar() {
  const [bookings, testimonials] = await Promise.all([
    getBookings(),
    getApprovedTestimonials(),
  ])

  const report = buildReport(bookings)
  const distinctStudents = report.byStudent.length
  const totalLessons = report.byStudent.reduce((sum, s) => sum + s.lessonCount, 0)

  const stats: Stat[] = [
    { value: distinctStudents, label: 'תלמידים למדו איתנו' },
    { value: totalLessons, label: 'שיעורים שנקבעו' },
  ]

  if (testimonials.length > 0) {
    const avg = testimonials.reduce((sum, t) => sum + t.stars, 0) / testimonials.length
    stats.push({
      value: Math.round(avg * 10) / 10,
      decimals: 1,
      suffix: ' / 5',
      label: `דירוג ממוצע (${testimonials.length} ביקורות)`,
    })
  }

  stats.push({ value: MAX_STUDENTS, label: 'תלמידים מקסימום לקבוצה' })

  return (
    <section className="px-4 py-10 border-y border-slate-200">
      <TrustBarCounters stats={stats} />
    </section>
  )
}
