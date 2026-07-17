import { NextRequest, NextResponse } from 'next/server'
import { isAdminConfigured } from '@/lib/supabaseAdmin'
import { createTestimonial } from '@/lib/serverDb'

// Public endpoint: anyone can submit a review, but it lands as 'pending' and
// only appears on the site once an admin approves it.
export async function POST(request: NextRequest) {
  if (!isAdminConfigured) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  const stars = typeof body.stars === 'number' ? Math.round(body.stars) : NaN

  if (!name || name.length > 100) {
    return NextResponse.json({ error: 'שם לא תקין' }, { status: 400 })
  }
  if (!text || text.length > 500) {
    return NextResponse.json({ error: 'הביקורת חייבת להכיל בין 1 ל-500 תווים' }, { status: 400 })
  }
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: 'דירוג לא תקין' }, { status: 400 })
  }

  try {
    const testimonial = await createTestimonial({ name, stars, text })
    return NextResponse.json({ testimonial })
  } catch {
    return NextResponse.json({ error: 'שמירת הביקורת נכשלה' }, { status: 500 })
  }
}
