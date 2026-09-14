'use client'

import { useEffect, useRef, useState } from 'react'
import { Slot, Booking, dayLabel, formatShortDate, GROUP_LABELS, isFixedBooking } from '@/lib/types'
import { removeBooking } from '@/lib/adminApi'
import { useToast } from './ui/Toast'
import { useConfirm } from './ui/ConfirmDialog'
import { useScrollLock } from '@/lib/useScrollLock'

// Picks which student the "−" button removes from a lesson. The scope follows
// the schedule mode: in "לוח קבוע" (standing) the student is dropped for good,
// in a specific week only that week's lesson is affected — including for a
// standing student, who stays enrolled in every other week.
export default function RemoveStudentModal({ slot, weekKey, date, standing = false, bookings, onClose, onChanged }: {
  slot: Slot
  weekKey: string
  date?: Date
  standing?: boolean
  bookings: Booking[]
  onClose: () => void
  onChanged: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const toast = useToast()
  const confirmDialog = useConfirm()
  const [removingId, setRemovingId] = useState<string | null>(null)

  const students = bookings.filter((b) => b.slotId === slot.id && b.weekKey === weekKey)
  const fixedStudents = standing ? [] : students.filter(isFixedBooking)
  const oneTimeStudents = standing ? students : students.filter((b) => !isFixedBooking(b))

  useScrollLock(true)

  useEffect(() => {
    dialogRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const lessonDate = date ? formatShortDate(date) : ''

  const remove = async (b: Booking) => {
    // A standing student removed from one week keeps the enrollment; anyone
    // else — and everyone in "לוח קבוע" — is removed outright.
    const weekOnly = !standing && isFixedBooking(b)
    const message = standing
      ? `${b.studentName} יוסר מהשעה הזו בכל השבועות.`
      : weekOnly
        ? `${b.studentName} לא ישתתף בשיעור${lessonDate ? ` בתאריך ${lessonDate}` : ' בשבוע זה'} בלבד — הוא יישאר תלמיד קבוע בשאר השבועות.`
        : `${b.studentName} יוסר מהשיעור.`
    if (!(await confirmDialog({
      title: 'להסיר את התלמיד מהשיעור?',
      message,
      confirmLabel: 'הסר',
      danger: true,
    }))) return

    setRemovingId(b.id)
    try {
      await removeBooking(b.id, weekOnly ? 'week' : undefined)
      toast('התלמיד הוסר')
      onChanged()
      // Nothing left to pick from once the last student is gone.
      if (students.length <= 1) onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'שגיאה בהסרה — נסו שוב', 'error')
    } finally {
      setRemovingId(null)
    }
  }

  const renderRow = (b: Booking) => (
    <button
      key={b.id}
      onClick={() => remove(b)}
      disabled={removingId !== null}
      className="w-full flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white hover:border-red-300 hover:bg-red-50 disabled:opacity-60 p-3 text-right transition-colors"
    >
      <div>
        <div className="font-bold text-slate-900 text-sm">{b.studentName}</div>
        <div className="text-xs text-slate-500">{b.grade || 'כיתה לא צוינה'} | {b.groupPreference || 'מסלול לא צוין'}</div>
      </div>
      <span className="text-xs font-semibold text-red-600 whitespace-nowrap">
        {removingId === b.id ? 'מסיר…' : 'הסר'}
      </span>
    </button>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="הסרת תלמיד מהשיעור"
        tabIndex={-1}
        className="w-full max-w-md max-h-[85vh] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl outline-none"
      >
        <div className="bg-slate-50 px-5 py-4 flex items-center justify-between border-b border-slate-200 sticky top-0">
          <div>
            <h3 className="font-black text-slate-900 text-lg">איזה תלמיד להסיר?</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              יום {dayLabel(slot.day)}{lessonDate ? ` ${lessonDate}` : ''} | <span dir="ltr">{slot.time}–{slot.endTime}</span> | {GROUP_LABELS[slot.groupType]}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              {standing
                ? '🔁 הסרה כאן מורידה את התלמיד מכל השבועות'
                : 'ההסרה חלה על השיעור הזה בלבד'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="סגירה"
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-lg transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-3">
          {students.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">אין תלמידים רשומים לשיעור זה</p>
          ) : standing ? (
            students.map(renderRow)
          ) : (
            <>
              {fixedStudents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-indigo-700">🔁 תלמידים קבועים ({fixedStudents.length})</p>
                  {fixedStudents.map(renderRow)}
                </div>
              )}
              {oneTimeStudents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-orange-700">תלמידים חד-פעמיים ({oneTimeStudents.length})</p>
                  {oneTimeStudents.map(renderRow)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
