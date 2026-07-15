'use client'

import { useState } from 'react'
import { Booking, formatPrice } from '@/lib/types'
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
  const [draft, setDraft] = useState(booking.price != null ? String(booking.price) : '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const trimmed = draft.trim()
    let price: number | null
    if (trimmed === '') {
      price = null
    } else {
      const parsed = Number(trimmed)
      if (!Number.isFinite(parsed) || parsed < 0) {
        toast('מחיר לא תקין', 'error')
        return
      }
      price = Math.round(parsed)
    }
    setSaving(true)
    try {
      await patchBooking(booking.id, { status: 'confirmed', price })
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
    <div className={`rounded-xl border p-4 shadow-sm ${isConfirmed ? 'border-green-300 bg-green-50/60' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900">{booking.studentName}</span>
            <span className={`text-xs rounded-full px-2 py-0.5 ${isConfirmed ? 'bg-green-50 text-green-700 border border-green-300' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
              {isConfirmed ? 'מאושר' : 'ממתין'}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">{booking.grade} | {booking.groupPreference || 'מסלול לא צוין'}</div>
          <div className="text-xs text-slate-400 mt-0.5">{slotLabel}</div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a
            href={`tel:${booking.phone}`}
            className="min-h-10 px-3 inline-flex items-center bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
            dir="ltr"
          >
            📞 {booking.phone}
          </a>
          <a
            href={whatsappUrl(booking.phone, booking.studentName)}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-10 px-3 inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-xs font-semibold text-white transition-colors"
          >
            <WhatsAppIcon />
            וואטסאפ
          </a>
        </div>
      </div>

      {/* Actions / price row */}
      {priceOpen ? (
        <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-3">
          <label className="text-xs text-slate-500 block mb-1.5">
            מחיר לשיעור (פנימי, לא חובה)
          </label>
          <div className="flex gap-2 flex-wrap">
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              placeholder="350"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              className="flex-1 min-w-[140px] bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
            />
            <button
              onClick={save}
              disabled={saving}
              className="min-h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-60"
            >
              {saving ? 'שומר…' : isConfirmed ? 'שמור מחיר' : '✓ אשר ושמור'}
            </button>
            <button
              onClick={() => { setPriceOpen(false); setDraft(booking.price != null ? String(booking.price) : '') }}
              className="min-h-10 px-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-xs font-semibold transition-colors"
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
              className="min-h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors"
            >
              ✓ אשר
            </button>
          ) : (
            <>
              <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                מחיר: {formatPrice(booking.price)}
              </span>
              <button
                onClick={() => setPriceOpen(true)}
                className="min-h-10 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                ערוך מחיר
              </button>
            </>
          )}
          <button
            onClick={remove}
            className="min-h-10 px-3 mr-auto bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs transition-colors border border-red-200"
          >
            מחק
          </button>
        </div>
      )}

      <div className="text-xs text-slate-400 mt-3">
        הורה: {booking.parentName} | נשלח: {new Date(booking.createdAt).toLocaleString('he-IL')}
      </div>
    </div>
  )
}
