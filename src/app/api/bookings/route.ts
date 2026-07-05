import { NextRequest, NextResponse } from 'next/server'
import { isAdminConfigured } from '@/lib/supabaseAdmin'
import { createBooking, SlotFullError, SlotNotFoundError, SlotPastError, NewBooking } from '@/lib/serverDb'
import { sendPushToAll } from '@/lib/webPush'
import { GroupType } from '@/lib/types'

const GROUP_TYPES: GroupType[] = ['middle-school', 'high-4', 'high-5', 'mixed', 'empty']

// Public endpoint: anyone can submit a booking request, but it is validated and
// written server-side so capacity is enforced and the bookings table stays
// unreadable from the browser.
export async function POST(request: NextRequest) {
  if (!isAdminConfigured) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const studentName = str(body.studentName)
  const parentName = str(body.parentName)
  const phone = str(body.phone)
  const grade = str(body.grade)
  const slotId = str(body.slotId)
  const weekKey = str(body.weekKey)
  const slotLabel = str(body.slotLabel)
  const groupPreference = body.groupPreference as GroupType

  if (!studentName || !parentName || !grade || !slotId || !weekKey) {
    return NextResponse.json({ error: 'חסרים פרטים' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekKey)) {
    return NextResponse.json({ error: 'שבוע לא תקין' }, { status: 400 })
  }
  if (!/^0\d{8,9}$/.test(phone.replace(/[-\s]/g, ''))) {
    return NextResponse.json({ error: 'מספר טלפון לא תקין' }, { status: 400 })
  }
  if (!GROUP_TYPES.includes(groupPreference)) {
    return NextResponse.json({ error: 'סוג קבוצה לא תקין' }, { status: 400 })
  }

  const newBooking: NewBooking = {
    slotId, weekKey, slotLabel, studentName, parentName, phone, grade, groupPreference,
  }

  try {
    const booking = await createBooking(newBooking)
    // Notify Shahar's phone. Must finish before the response is returned
    // (serverless), and never fails the booking itself.
    await sendPushToAll({
      title: 'הרשמה חדשה! 📚',
      body: `${studentName} (${grade})\n${slotLabel}\nטלפון הורה: ${phone}`,
      url: '/admin',
    })
    return NextResponse.json({ booking })
  } catch (err) {
    if (err instanceof SlotFullError) {
      return NextResponse.json({ error: 'המקום התמלא' }, { status: 409 })
    }
    if (err instanceof SlotNotFoundError) {
      return NextResponse.json({ error: 'המשבצת כבר לא קיימת — רעננו את הדף ונסו שוב' }, { status: 409 })
    }
    if (err instanceof SlotPastError) {
      return NextResponse.json({ error: 'השעה כבר עברה — בחרו שעה אחרת' }, { status: 409 })
    }
    return NextResponse.json({ error: 'שמירת הבקשה נכשלה' }, { status: 500 })
  }
}
