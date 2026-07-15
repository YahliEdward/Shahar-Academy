import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { isAdminConfigured } from '@/lib/supabaseAdmin'
import {
  getBookings, createBookingAsAdmin, createStandingBookingAsAdmin,
  SlotFullError, SlotNotFoundError, SlotPastError,
} from '@/lib/serverDb'
import { TEMPLATE_KEY } from '@/lib/types'

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
  const groupPreference = body.groupPreference as string | undefined

  if (!studentName || !slotId || !weekKey) {
    return NextResponse.json({ error: 'חסרים פרטים' }, { status: 400 })
  }
  const isStanding = weekKey === TEMPLATE_KEY
  if (!isStanding && !/^\d{4}-\d{2}-\d{2}$/.test(weekKey)) {
    return NextResponse.json({ error: 'שבוע לא תקין' }, { status: 400 })
  }
  if (phone && !/^0\d{8,9}$/.test(phone.replace(/[-\s]/g, ''))) {
    return NextResponse.json({ error: 'מספר טלפון לא תקין' }, { status: 400 })
  }

  // price is optional; when present it must be a non-negative number (whole ₪).
  let price: number | null | undefined
  if (body.price !== undefined && body.price !== null) {
    if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0) {
      return NextResponse.json({ error: 'מחיר לא תקין' }, { status: 400 })
    }
    price = Math.round(body.price)
  } else {
    price = body.price as null | undefined
  }

  try {
    const create = isStanding ? createStandingBookingAsAdmin : createBookingAsAdmin
    const booking = await create({
      slotId,
      weekKey,
      slotLabel,
      studentName,
      parentName: parentName || undefined,
      phone: phone || undefined,
      grade: grade || undefined,
      groupPreference,
      price,
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
    console.error('createBookingAsAdmin failed', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `שמירת התלמיד נכשלה: ${detail}` }, { status: 500 })
  }
}
