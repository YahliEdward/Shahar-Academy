import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import {
  getTemplate, getSlots, saveTemplate, saveSlots, weekHasOverride, resetWeekToDefault,
} from '@/lib/serverDb'
import { Slot, GroupType, MAX_STUDENTS } from '@/lib/types'

const GROUP_TYPES: GroupType[] = ['middle-school', 'high-4', 'high-5', 'mixed', 'empty']
const TIME_RE = /^\d{2}:\d{2}$/

function isValidSlot(s: unknown): s is Slot {
  if (typeof s !== 'object' || s === null) return false
  const o = s as Record<string, unknown>
  return (
    typeof o.id === 'string' && o.id.length > 0 && o.id.length <= 100 &&
    typeof o.day === 'number' && Number.isInteger(o.day) && o.day >= 0 && o.day <= 4 &&
    typeof o.time === 'string' && TIME_RE.test(o.time) &&
    typeof o.endTime === 'string' && TIME_RE.test(o.endTime) &&
    typeof o.groupType === 'string' && GROUP_TYPES.includes(o.groupType as GroupType) &&
    typeof o.enrolled === 'number' && Number.isInteger(o.enrolled) &&
    o.enrolled >= 0 && o.enrolled <= MAX_STUDENTS
  )
}

// GET /api/admin/slots?mode=template
// GET /api/admin/slots?weekKey=YYYY-MM-DD
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  if (searchParams.get('mode') === 'template') {
    return NextResponse.json({ slots: await getTemplate() })
  }
  const weekKey = searchParams.get('weekKey') ?? ''
  const [slots, isOverride] = await Promise.all([getSlots(weekKey), weekHasOverride(weekKey)])
  return NextResponse.json({ slots, isOverride })
}

// PUT body: { mode: 'template' } | { mode: 'week', weekKey } with { slots }
export async function PUT(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
  if (body.mode === 'template') {
    await saveTemplate(slots)
  } else {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.weekKey ?? '')) {
      return NextResponse.json({ error: 'Invalid weekKey' }, { status: 400 })
    }
    await saveSlots(slots, body.weekKey!)
  }
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/slots?weekKey=YYYY-MM-DD — drop a week's override.
export async function DELETE(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const weekKey = searchParams.get('weekKey') ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekKey)) {
    return NextResponse.json({ error: 'Invalid weekKey' }, { status: 400 })
  }
  await resetWeekToDefault(weekKey)
  return NextResponse.json({ ok: true })
}
