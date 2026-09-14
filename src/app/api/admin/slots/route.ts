import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { isAdminConfigured } from '@/lib/supabaseAdmin'
import {
  getTemplate, getSlots, saveTemplate, saveSlots, weekHasOverride, resetWeekToDefault,
  reconcileWeekEnrolled, syncStandingBookings,
} from '@/lib/serverDb'
import { Slot, GroupType, OVER_CAPACITY_LIMIT } from '@/lib/types'

const GROUP_TYPES: GroupType[] = ['middle-school', 'high-4', 'high-5', 'mixed', 'empty']
const TIME_RE = /^\d{2}:\d{2}$/

function isValidSlot(s: unknown): s is Slot {
  if (typeof s !== 'object' || s === null) return false
  const o = s as Record<string, unknown>
  return (
    typeof o.id === 'string' && o.id.length > 0 && o.id.length <= 100 &&
    typeof o.day === 'number' && Number.isInteger(o.day) && o.day >= 0 && o.day <= 6 &&
    typeof o.time === 'string' && TIME_RE.test(o.time) &&
    typeof o.endTime === 'string' && TIME_RE.test(o.endTime) &&
    typeof o.groupType === 'string' && GROUP_TYPES.includes(o.groupType as GroupType) &&
    // The ceiling, not the standard: a slot the admin deliberately took past
    // MAX_STUDENTS must still be saveable, or every later edit to that week
    // (times, group type, adding an hour) would be rejected.
    typeof o.enrolled === 'number' && Number.isInteger(o.enrolled) &&
    o.enrolled >= 0 && o.enrolled <= OVER_CAPACITY_LIMIT
  )
}

// GET /api/admin/slots?mode=template
// GET /api/admin/slots?weekKey=YYYY-MM-DD
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdminConfigured) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  }
  const { searchParams } = new URL(request.url)
  try {
    if (searchParams.get('mode') === 'template') {
      // Opportunistic self-heal: a week that just entered the browsable
      // range picks up the standing roster without needing a background job.
      // Sync only touches follower weeks' rows, never the template itself,
      // so it can run concurrently with reading the template.
      const [, template] = await Promise.all([syncStandingBookings(), getTemplate()])
      return NextResponse.json({ slots: template })
    }
    const weekKey = searchParams.get('weekKey') ?? ''
    // Opportunistic self-heal: every seat is a named student now, so realign
    // enrolled with the week's actual bookings before reading them back.
    await reconcileWeekEnrolled(weekKey)
    const [slots, isOverride] = await Promise.all([getSlots(weekKey), weekHasOverride(weekKey)])
    return NextResponse.json({ slots, isOverride })
  } catch {
    return NextResponse.json({ error: 'Failed to load slots' }, { status: 500 })
  }
}

// PUT body: { mode: 'template' } | { mode: 'week', weekKey } with { slots }
export async function PUT(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdminConfigured) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  }
  let body: { mode?: string; weekKey?: string; slots?: Slot[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const slots = body.slots ?? []
  if (!Array.isArray(slots) || !slots.every(isValidSlot)) {
    return NextResponse.json({ error: 'Invalid slots' }, { status: 400 })
  }
  try {
    if (body.mode === 'template') {
      await saveTemplate(slots)
    } else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.weekKey ?? '')) {
        return NextResponse.json({ error: 'Invalid weekKey' }, { status: 400 })
      }
      // An explicit week edit is a deliberate override — the week stops
      // following the template until it's reset.
      await saveSlots(slots, body.weekKey!, true)
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to save slots' }, { status: 500 })
  }
}

// DELETE /api/admin/slots?weekKey=YYYY-MM-DD — drop a week's override.
export async function DELETE(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdminConfigured) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  }
  const { searchParams } = new URL(request.url)
  const weekKey = searchParams.get('weekKey') ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekKey)) {
    return NextResponse.json({ error: 'Invalid weekKey' }, { status: 400 })
  }
  try {
    await resetWeekToDefault(weekKey)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to reset week' }, { status: 500 })
  }
}
