import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { getBookings } from '@/lib/serverDb'

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const bookings = await getBookings()
  return NextResponse.json({ bookings })
}
