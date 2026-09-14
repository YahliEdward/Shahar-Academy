import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { isAdminConfigured } from '@/lib/supabaseAdmin'
import {
  updateBooking, deleteBooking, isStandingBooking, removeStandingBooking,
  removeBookingForWeek, MigrationRequiredError,
} from '@/lib/serverDb'
import { Booking } from '@/lib/types'

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdminConfigured) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  }
  const { id } = await ctx.params
  let updates: Partial<Booking>
  try {
    updates = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (updates.price !== undefined && updates.price !== null && typeof updates.price !== 'number') {
    return NextResponse.json({ error: 'מחיר לא תקין' }, { status: 400 })
  }
  try {
    await updateBooking(id, updates)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }
}

// DELETE /api/admin/bookings/<id>[?scope=week]
// Default scope removes the student for good — including, for a standing
// student, every week they were cloned into. scope=week removes them from that
// one lesson only and leaves a standing enrollment running.
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdminConfigured) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  }
  const { id } = await ctx.params
  const scope = new URL(request.url).searchParams.get('scope')
  try {
    if (scope === 'week') {
      await removeBookingForWeek(id)
    } else if (await isStandingBooking(id)) {
      // A standing (recurring) master row has clones in other weeks that need
      // removing too — deleteBooking only knows about a single week's row.
      await removeStandingBooking(id)
    } else {
      await deleteBooking(id)
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof MigrationRequiredError) {
      return NextResponse.json(
        { error: 'יש להריץ את supabase-schema.sql ב-Supabase כדי להסיר תלמיד קבוע משבוע בודד' },
        { status: 500 },
      )
    }
    return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 })
  }
}
