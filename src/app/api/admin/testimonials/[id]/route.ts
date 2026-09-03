import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { isAdmin } from '@/lib/auth'
import { isAdminConfigured } from '@/lib/supabaseAdmin'
import { updateTestimonialStatus, deleteTestimonial } from '@/lib/serverDb'

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdminConfigured) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  }
  const { id } = await ctx.params
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (body.status !== 'approved' && body.status !== 'rejected') {
    return NextResponse.json({ error: 'סטטוס לא תקין' }, { status: 400 })
  }
  try {
    await updateTestimonialStatus(id, body.status)
    // The homepage renders only approved reviews and is cached; without this
    // an approval would not show publicly until the next revalidate window.
    revalidatePath('/')
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to update testimonial' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdminConfigured) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  }
  const { id } = await ctx.params
  try {
    await deleteTestimonial(id)
    revalidatePath('/')
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete testimonial' }, { status: 500 })
  }
}
