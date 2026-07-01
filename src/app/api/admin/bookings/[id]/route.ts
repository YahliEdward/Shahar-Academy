import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { updateBooking, deleteBooking } from '@/lib/serverDb'
import { Booking } from '@/lib/types'

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await ctx.params
  let updates: Partial<Booking>
  try {
    updates = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  await updateBooking(id, updates)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await ctx.params
  await deleteBooking(id)
  return NextResponse.json({ ok: true })
}
