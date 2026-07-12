import { NextRequest, NextResponse } from 'next/server'
import { getSlots, getBookings } from '@/lib/serverDb'
import { sendPushToAll } from '@/lib/webPush'
import { DayIndex, GROUP_LABELS, MOTZASH_DAY, dayLabel } from '@/lib/types'

// Daily "today's lessons" summary pushed to Shahar's devices, triggered by
// Vercel Cron (see vercel.json). Vercel calls this route with
// Authorization: Bearer $CRON_SECRET once that env var is set on the project.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Today's date in Israel, independent of the serverless region's timezone
  // (same Intl approach as serverDb.isSlotInPast).
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date())
  const today = new Date(`${todayStr}T00:00:00Z`)
  // Every calendar day maps to a schedule day: Sun–Fri directly, and Saturday
  // to the optional Motzash (Saturday-night) day.
  const dayIndex = today.getUTCDay() as DayIndex

  const sunday = new Date(today)
  sunday.setUTCDate(sunday.getUTCDate() - dayIndex)
  const weekKey = sunday.toISOString().slice(0, 10)

  const todaySlots = (await getSlots(weekKey)).filter((s) => s.day === dayIndex && s.enrolled > 0)
  if (todaySlots.length === 0) {
    return NextResponse.json({ ok: true, skipped: 'no-lessons' })
  }

  // Bookings are matched through the fetched slot list — slot ids are only
  // parseable for template slots, never for override/extra ones.
  const bookings = await getBookings()
  const lines = todaySlots.map((slot) => {
    const students = bookings
      .filter((b) => b.weekKey === weekKey && b.slotId === slot.id)
      .map((b) => b.studentName)
    const who = students.length > 0 ? students.join(', ') : `${slot.enrolled} תלמידים`
    return `${slot.time} · ${GROUP_LABELS[slot.groupType]} · ${who}`
  })

  const count = todaySlots.length
  const dayName = dayIndex === MOTZASH_DAY ? dayLabel(dayIndex) : `יום ${dayLabel(dayIndex)}`
  await sendPushToAll({
    title: `📚 ${count === 1 ? 'שיעור אחד' : `${count} שיעורים`} היום (${dayName})`,
    body: lines.join('\n'),
    url: '/admin',
  })
  return NextResponse.json({ ok: true, lessons: count })
}
