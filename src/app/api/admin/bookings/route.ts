import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { isAdminConfigured } from '@/lib/supabaseAdmin'
import { getBookings, createBookingAsAdmin, SlotFullError, SlotNotFoundError, SlotPastError } from '@/lib/serverDb'
import { GroupType } from '@/lib/types'

const GROUP_TYPES: GroupType[] = ['middle-school', 'high-4', 'high-5', 'mixed', 'empty']

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdminConfigured) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  }
  try {
    const bookings = await getBookings()
    return NextResponse.json({ bookings })
  } catch {
    return NextResponse.json({ error: 'Failed to load bookings' }, { status: 500 })
  }
}

// Admin-only: register a student directly, skipping the public booking form.
// Only studentName is required — phone/parentName/grade are optional here.
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
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
  const groupPreference = body.groupPreference as GroupType | undefined

  if (!studentName || !slotId || !weekKey) {
    return NextResponse.json({ error: 'חסרים פרטים' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekKey)) {
    return NextResponse.json({ error: 'שבוע לא תקין' }, { status: 400 })
  }
  if (phone && !/^0\d{8,9}$/.test(phone.replace(/[-\s]/g, ''))) {
    return NextResponse.json({ error: 'מספר טלפון לא תקין' }, { status: 400 })
  }
  if (groupPreference !== undefined && !GROUP_TYPES.includes(groupPreference)) {
    return NextResponse.json({ error: 'סוג קבוצה לא תקין' }, { status: 400 })
  }

  try {
    const booking = await createBookingAsAdmin({
      slotId,
      weekKey,
      slotLabel,
      studentName,
      parentName: parentName || undefined,
      phone: phone || undefined,
      grade: grade || undefined,
      groupPreference,
    })
    return NextResponse.json({ booking })
  } catch (err) {
    if (err instanceof SlotFullError) {
      return NextResponse.json({ error: 'המקום התמלא' }, { status: 409 })
    }
    if (err instanceof SlotNotFoundError) {
      return NextResponse.json({ error: 'המשבצת כבר לא קיימת' }, { status: 409 })
    }
    if (err instanceof SlotPastError) {
      return NextResponse.json({ error: 'השעה כבר עברה' }, { status: 409 })
    }
    return NextResponse.json({ error: 'שמירת התלמיד נכשלה' }, { status: 500 })
  }
}
