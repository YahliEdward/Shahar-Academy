import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import {
  getTemplate, getSlots, saveTemplate, saveSlots, weekHasOverride, resetWeekToDefault,
} from '@/lib/serverDb'
import { Slot } from '@/lib/types'

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
  if (body.mode === 'template') {
    await saveTemplate(slots)
  } else {
    await saveSlots(slots, body.weekKey ?? '')
  }
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/slots?weekKey=YYYY-MM-DD — drop a week's override.
export async function DELETE(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  await resetWeekToDefault(searchParams.get('weekKey') ?? '')
  return NextResponse.json({ ok: true })
}
