import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { isAdminConfigured } from '@/lib/supabaseAdmin'
import { isPushConfigured, saveSubscription, deleteSubscription, PushSubscriptionInput } from '@/lib/webPush'

function isValidSubscription(s: unknown): s is PushSubscriptionInput {
  if (typeof s !== 'object' || s === null) return false
  const o = s as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }
  return (
    typeof o.endpoint === 'string' && o.endpoint.startsWith('https://') &&
    typeof o.keys === 'object' && o.keys !== null &&
    typeof o.keys.p256dh === 'string' && typeof o.keys.auth === 'string'
  )
}

// POST /api/admin/push — register this device for booking notifications.
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdminConfigured || !isPushConfigured) {
    return NextResponse.json({ error: 'Push not configured' }, { status: 503 })
  }
  let body: { subscription?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (!isValidSubscription(body.subscription)) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }
  try {
    await saveSubscription(body.subscription)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }
}

// DELETE /api/admin/push — stop notifications for this device.
export async function DELETE(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdminConfigured) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  }
  let body: { endpoint?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (typeof body.endpoint !== 'string' || !body.endpoint) {
    return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
  }
  try {
    await deleteSubscription(body.endpoint)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 })
  }
}
