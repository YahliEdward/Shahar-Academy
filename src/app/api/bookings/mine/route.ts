import { NextRequest, NextResponse } from 'next/server'
import { isAdminConfigured } from '@/lib/supabaseAdmin'
import { getBookingsByIds } from '@/lib/serverDb'
import { createRateLimiter } from '@/lib/rateLimit'
import { getLessonLocation } from '@/lib/lessonLocation'

const MAX_IDS = 20

// Read on every schedule page load, so much looser than the booking limit —
// it only has to make guessing booking ids impractical.
const limiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 200 })

// Public endpoint behind "my upcoming lessons": the browser sends the ids of
// bookings it made itself (kept in localStorage) and gets back when each
// lesson meets and whether it's confirmed. Holding a booking id is the proof
// of having booked, so the lesson address comes back too — but never the
// phone or any other personal detail.
export async function POST(request: NextRequest) {
  if (!isAdminConfigured) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  }
  if (!limiter.allow(request)) {
    return NextResponse.json({ error: 'יותר מדי בקשות. נסו שוב מאוחר יותר.' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id): id is string => typeof id === 'string' && /^[a-z0-9]{1,40}$/.test(id))
    : []
  if (ids.length === 0 || ids.length > MAX_IDS) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const bookings = await getBookingsByIds(ids)
  const lessons = bookings
    .filter((b) => b.weekKey && b.lessonDay !== undefined && b.lessonTime && b.lessonEndTime)
    .map((b) => ({
      id: b.id,
      slotId: b.slotId,
      studentName: b.studentName,
      weekKey: b.weekKey,
      day: b.lessonDay,
      time: b.lessonTime,
      endTime: b.lessonEndTime,
      status: b.status,
    }))

  return NextResponse.json({
    lessons,
    location: lessons.length > 0 ? getLessonLocation() : null,
  })
}
