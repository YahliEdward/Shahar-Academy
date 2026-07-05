'use client'

import { useEffect, useRef } from 'react'
import { Slot, Booking, DAYS, GROUP_LABELS } from '@/lib/types'
import { removeBooking } from '@/lib/adminApi'
import { whatsappUrl } from '../lib'
import { useToast } from './ui/Toast'
import { useConfirm } from './ui/ConfirmDialog'

export default function StudentsModal({ slot, weekKey, bookings, onClose, onChanged }: {
  slot: Slot
  weekKey: string
  bookings: Booking[]
  onClose: () => void
  onChanged: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const toast = useToast()
  const confirmDialog = useConfirm()

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const students = bookings.filter((b) => b.slotId === slot.id && b.weekKey === weekKey)

  const remove = async (b: Booking) => {
    if (!(await confirmDialog({
      title: 'להסיר את התלמיד מהשיעור?',
      message: `${b.studentName} יוסר מהשיעור.`,
      confirmLabel: 'הסר',
      danger: true,
    }))) return
    try {
      await removeBooking(b.id)
      toast('התלמיד הוסר')
      onChanged()
    } catch {
      toast('שגיאה בהסרה — נסו שוב', 'error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="תלמידים רשומים"
        tabIndex={-1}
        className="w-full max-w-md max-h-[85vh] overflow-y-auto bg-[#131827] rounded-2xl border border-zinc-700/50 shadow-2xl outline-none"
      >
        <div className="bg-zinc-800/60 px-5 py-4 flex items-center justify-between border-b border-zinc-700/50 sticky top-0">
          <div>
            <h3 className="font-black text-white text-lg">תלמידים רשומים</h3>
            <p className="text-sm text-zinc-400 mt-0.5">
              יום {DAYS[slot.day]} | <span dir="ltr">{slot.time}–{slot.endTime}</span> | {GROUP_LABELS[slot.groupType]}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="סגירה"
            className="w-8 h-8 rounded-lg bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-zinc-300 text-lg transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-3">
          {students.length === 0 ? (
            <p className="text-center text-zinc-500 py-8 text-sm">אין תלמידים רשומים יותר</p>
          ) : (
            students.map((b) => (
              <div
                key={b.id}
                className={`rounded-xl border p-4 ${b.status === 'confirmed' ? 'border-green-500/30 bg-green-900/10' : 'border-zinc-700/50 bg-zinc-800/40'}`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-bold text-white">{b.studentName}</div>
                    <div className="text-xs text-zinc-400">{b.grade} | {GROUP_LABELS[b.groupPreference]}</div>
                    <span className={`inline-block mt-1 text-xs rounded px-2 py-0.5 ${b.status === 'confirmed' ? 'bg-green-900/50 text-green-300 border border-green-700/40' : 'bg-zinc-700 text-zinc-200'}`}>
                      {b.status === 'confirmed' ? 'מאושר' : 'ממתין לאישור'}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <a
                      href={`tel:${b.phone}`}
                      className="min-h-10 px-3 inline-flex items-center bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs font-semibold text-white transition-colors"
                      dir="ltr"
                    >
                      📞 {b.phone}
                    </a>
                    <a
                      href={whatsappUrl(b.phone, b.studentName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-10 px-3 inline-flex items-center bg-green-700 hover:bg-green-600 rounded-lg text-xs font-semibold text-white transition-colors"
                    >
                      וואטסאפ
                    </a>
                  </div>
                </div>
                {b.price && (
                  <div className="text-xs text-zinc-400 mt-2">מחיר: {b.price}</div>
                )}
                <div className="text-xs text-zinc-600 mt-2 flex items-center justify-between gap-3 flex-wrap">
                  <span>הורה: {b.parentName} | נשלח: {new Date(b.createdAt).toLocaleString('he-IL')}</span>
                  <button
                    onClick={() => remove(b)}
                    className="px-3 py-1.5 bg-red-900/40 hover:bg-red-800/60 text-red-400 rounded-lg text-xs transition-colors border border-red-800/40"
                  >
                    הסר תלמיד
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
