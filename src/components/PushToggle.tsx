'use client'

import { useState, useEffect } from 'react'
import { savePushSubscription, removePushSubscription } from '@/lib/adminApi'

// Booking-notification opt-in for the admin dashboard. On iPhone this only
// works after the site is added to the home screen (iOS 16.4+), so when push
// isn't available on an iOS browser we show install instructions instead.

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

type PushState = 'loading' | 'unsupported' | 'needs-install' | 'off' | 'on' | 'denied'

export default function PushToggle() {
  const [state, setState] = useState<PushState>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const detect = async (): Promise<PushState> => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
        const standalone = window.matchMedia('(display-mode: standalone)').matches
        return isIOS && !standalone ? 'needs-install' : 'unsupported'
      }
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
        const sub = await reg.pushManager.getSubscription()
        return sub ? 'on' : Notification.permission === 'denied' ? 'denied' : 'off'
      } catch {
        return 'unsupported'
      }
    }
    detect().then((s) => { if (!cancelled) setState(s) })
    return () => { cancelled = true }
  }, [])

  const enable = async () => {
    setBusy(true)
    setError('')
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
      await savePushSubscription(sub.toJSON())
      setState('on')
    } catch {
      if (Notification.permission === 'denied') setState('denied')
      else setError('הפעלת ההתראות נכשלה — נסו שוב')
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    setError('')
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      if (sub) {
        await removePushSubscription(sub.endpoint)
        await sub.unsubscribe()
      }
      setState('off')
    } catch {
      setError('כיבוי ההתראות נכשל — נסו שוב')
    } finally {
      setBusy(false)
    }
  }

  if (state === 'loading' || state === 'unsupported') return null

  if (state === 'needs-install') {
    return (
      <div className="mb-6 bg-zinc-900 border border-zinc-700/50 rounded-xl p-4 text-sm text-zinc-400 leading-relaxed">
        <span className="font-bold text-white">🔔 רוצים התראות על הרשמות חדשות?</span>{' '}
        הוסיפו את האתר למסך הבית: לחצו על כפתור השיתוף בספארי ← &quot;הוספה למסך הבית&quot;,
        ואז פתחו את האפליקציה והפעילו כאן את ההתראות.
      </div>
    )
  }

  if (state === 'denied') {
    return (
      <div className="mb-6 bg-zinc-900 border border-zinc-700/50 rounded-xl p-4 text-sm text-zinc-400">
        🔕 ההתראות חסומות במכשיר הזה — אפשרו התראות לאתר בהגדרות ורעננו את הדף.
      </div>
    )
  }

  if (state === 'off') {
    return (
      <div className="mb-6 bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-yellow-100 font-bold">🔔 קבלו התראה לנייד על כל הרשמה חדשה</p>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-red-400">{error}</span>}
          <button
            onClick={enable}
            disabled={busy}
            className="px-4 py-2 bg-yellow-400 text-black text-sm font-black rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-60"
          >
            {busy ? 'מפעיל…' : 'הפעל התראות'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6 flex items-center justify-between text-xs text-zinc-500 px-1">
      <span>🔔 התראות על הרשמות חדשות פעילות במכשיר הזה</span>
      <div className="flex items-center gap-3">
        {error && <span className="text-red-400">{error}</span>}
        <button
          onClick={disable}
          disabled={busy}
          className="text-zinc-600 hover:text-zinc-300 transition-colors disabled:opacity-60"
        >
          {busy ? 'מכבה…' : 'כבה'}
        </button>
      </div>
    </div>
  )
}
