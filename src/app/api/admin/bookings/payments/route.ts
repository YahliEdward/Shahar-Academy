import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { isAdminConfigured } from '@/lib/supabaseAdmin'
import { setBookingsPaid, MigrationRequiredError } from '@/lib/serverDb'

// POST /api/admin/bookings/payments  { ids: string[], paid: boolean }
// Marks one lesson — or all of a student's open lessons at once — as paid/unpaid.
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdminConfigured) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  }
  let body: { ids?: unknown; paid?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const { ids, paid } = body
  if (
    !Array.isArray(ids) || ids.length === 0 || ids.length > 500
    || !ids.every((id) => typeof id === 'string') || typeof paid !== 'boolean'
  ) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  try {
    await setBookingsPaid(ids, paid)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof MigrationRequiredError) {
      return NextResponse.json(
        { error: 'יש להריץ את supabase-schema.sql ב-Supabase כדי להפעיל מעקב תשלומים' },
        { status: 500 },
      )
    }
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 })
  }
}
