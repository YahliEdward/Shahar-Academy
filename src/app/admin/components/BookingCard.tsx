'use client'

import { useState } from 'react'
import { Booking, GROUP_LABELS } from '@/lib/types'
import { patchBooking, removeBooking } from '@/lib/adminApi'
import { whatsappUrl } from '../lib'
import { useToast } from './ui/Toast'
import { useConfirm } from './ui/ConfirmDialog'
import WhatsAppIcon from './WhatsAppIcon'

export default function BookingCard({ booking, slotLabel, onRefresh }: {
  booking: Booking
  slotLabel: string
  onRefresh: () => void
}) {
  const toast = useToast()
  const confirmDialog = useConfirm()
  const isConfirmed = booking.status === 'confirmed'
  // Price editing is collapsed by default — it opens as part of the confirm
  // flow (pending) or via the edit toggle (confirmed).
  const [priceOpen, setPriceOpen] = useState(false)
  const [draft, setDraft] = useState(booking.price ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await patchBooking(booking.id, { status: 'confirmed', price: draft || undefined })
      toast(isConfirmed ? 'המחיר עודכן ✓' : 'הבקשה אושרה ✓')
      setPriceOpen(false)
      onRefresh()
    } catch {
      toast('שגיאה בשמירה — נסו שוב', 'error')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!(await confirmDialog({
      title: 'למחוק את הבקשה?',
      message: `הבקשה של ${booking.studentName} תימחק לצמיתות.`,
      confirmLabel: 'מחק',
      danger: true,
    }))) return
    try {
      await removeBooking(booking.id)
      toast('הבקשה נמחקה')
      onRefresh()
    } catch {
      toast('שגיאה במחיקה — נסו שוב', 'error')
    }
  }

  return (
    <div className={`rounded-xl border p-4 ${isConfirmed ? 'border-green-500/30 bg-green-900/10' : 'border-zinc-700/50 bg-zinc-800/40'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white">{booking.studentName}</span>
            <span className={`text-xs rounded-full px-2 py-0.5 ${isConfirmed ? 'bg-green-900/50 text-green-300 border border-green-700/40' : 'bg-yellow-400/15 text-yellow-300 border border-yellow-400/30'}`}>
              {isConfirmed ? 'מאושר' : 'ממתין'}
            </span>
          </div>
          <div className="text-xs text-zinc-400 mt-1">{booking.grade} | {GROUP_LABELS[booking.groupPreference]}</div>
          <div className="text-xs text-zinc-500 mt-0.5">{slotLabel}</div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a
            href={`tel:${booking.phone}`}
            className="min-h-10 px-3 inline-flex items-center bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs font-semibold text-white transition-colors"
            dir="ltr"
          >
            📞 {booking.phone}
          </a>
          <a
            href={whatsappUrl(booking.phone, booking.studentName)}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-10 px-3 inline-flex items-center gap-1.5 bg-green-700 hover:bg-green-600 rounded-lg text-xs font-semibold text-white transition-colors"
          >
            <WhatsAppIcon />
            וואטסאפ
          </a>
        </div>
      </div>

      {/* Actions / price row */}
      {priceOpen ? (
        <div className="mt-3 rounded-lg bg-zinc-900/60 border border-zinc-700/50 p-3">
          <label className="text-xs text-zinc-500 block mb-1.5">
            מחיר שסוכם (פנימי, לא חובה)
          </label>
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              placeholder="למשל: 350₪ לחודש"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              className="flex-1 min-w-[140px] bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-yellow-400 transition-colors"
            />
            <button
              onClick={save}
              disabled={saving}
              className="min-h-10 px-4 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-lg text-xs transition-colors disabled:opacity-60"
            >
              {saving ? 'שומר…' : isConfirmed ? 'שמור מחיר' : '✓ אשר ושמור'}
            </button>
            <button
              onClick={() => { setPriceOpen(false); setDraft(booking.price ?? '') }}
              className="min-h-10 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg text-xs font-semibold transition-colors"
            >
              בטל
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {!isConfirmed ? (
            <button
              onClick={() => setPriceOpen(true)}
              className="min-h-10 px-5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-lg text-sm transition-colors"
            >
              ✓ אשר
            </button>
          ) : (
            <>
              <span className="text-xs text-zinc-400 bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2">
                מחיר: {booking.price || 'לא הוגדר'}
              </span>
              <button
                onClick={() => setPriceOpen(true)}
                className="min-h-10 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold transition-colors"
              >
                ערוך מחיר
              </button>
            </>
          )}
          <button
            onClick={remove}
            className="min-h-10 px-3 mr-auto bg-red-900/40 hover:bg-red-800/60 text-red-400 rounded-lg text-xs transition-colors border border-red-800/40"
          >
            מחק
          </button>
        </div>
      )}

      <div className="text-xs text-zinc-600 mt-3">
        הורה: {booking.parentName} | נשלח: {new Date(booking.createdAt).toLocaleString('he-IL')}
      </div>
    </div>
  )
}
