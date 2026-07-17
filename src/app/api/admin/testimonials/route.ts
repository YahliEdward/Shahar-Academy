import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { isAdminConfigured } from '@/lib/supabaseAdmin'
import { getTestimonials } from '@/lib/serverDb'

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdminConfigured) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  }
  try {
    const testimonials = await getTestimonials()
    return NextResponse.json({ testimonials })
  } catch {
    return NextResponse.json({ error: 'Failed to load testimonials' }, { status: 500 })
  }
}
