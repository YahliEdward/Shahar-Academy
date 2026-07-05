import webpush from 'web-push'
import { getSupabaseAdmin } from './supabaseAdmin'

// Server-only web push. Subscriptions live in the push_subscriptions table
// (service-role access only) so notifications survive deploys and reach every
// device Shahar enabled them on.

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
const privateKey = process.env.VAPID_PRIVATE_KEY ?? ''

export const isPushConfigured = Boolean(publicKey && privateKey)

let vapidSet = false
function ensureVapid() {
  if (!vapidSet) {
    webpush.setVapidDetails('mailto:yahliking987@gmail.com', publicKey, privateKey)
    vapidSet = true
  }
}

export interface PushSubscriptionInput {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export async function saveSubscription(sub: PushSubscriptionInput): Promise<void> {
  const { error } = await getSupabaseAdmin().from('push_subscriptions').upsert({
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
  })
  if (error) throw new Error(`Failed to save push subscription: ${error.message}`)
}

export async function deleteSubscription(endpoint: string): Promise<void> {
  await getSupabaseAdmin().from('push_subscriptions').delete().eq('endpoint', endpoint)
}

// Sends a notification to every registered device. Expired subscriptions
// (device removed the app / revoked permission) are pruned as we go.
// Never throws — a failed notification must not fail the booking that
// triggered it.
export async function sendPushToAll(payload: { title: string; body: string; url?: string }): Promise<void> {
  if (!isPushConfigured) return
  try {
    ensureVapid()
    const db = getSupabaseAdmin()
    const { data: subs } = await db.from('push_subscriptions').select('*')
    if (!subs || subs.length === 0) return

    const message = JSON.stringify(payload)
    await Promise.all(subs.map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          message
        )
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await db.from('push_subscriptions').delete().eq('endpoint', row.endpoint)
        } else {
          console.error('Push notification failed:', err)
        }
      }
    }))
  } catch (err) {
    console.error('Push notification error:', err)
  }
}
