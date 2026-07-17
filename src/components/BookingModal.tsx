'use client'

import { useState, useEffect, useRef } from 'react'
import { Slot, GROUP_LABELS, dayLabel, formatShortDate } from '@/lib/types'
import { submitBooking } from '@/lib/adminApi'
import { WHATSAPP_NUMBER } from '@/lib/constants'
import { buildLessonIcs, downloadIcs } from '@/lib/ics'
import { readSavedRegistration, saveRegistration, clearSavedRegistration } from '@/lib/lastRegistration'
import { useScrollLock } from '@/lib/useScrollLock'

const adminWhatsappUrl = (studentName: string, grade: string, slotLabel: string, phone: string) => {
  const msg = encodeURIComponent(
    `הרשמה חדשה! 📚\n` +
    `תלמיד: ${studentName} (${grade})\n` +
    `שיעור: ${slotLabel}\n` +
    `טלפון: ${phone}`
  )
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`
}

interface Props {
  slot: Slot
  weekKey: string
  weekDates: Date[]
  onClose: () => void
  onBooked: () => void
}

const GRADE_OPTIONS = [
  'כיתה ח\'', 'כיתה ט\'',
  'כיתה י\'', 'כיתה י\"א', 'כיתה י\"ב',
]

// Grades whose favored track is unambiguous — set automatically, no follow-up question.
const AUTO_TRACK: Record<string, string> = {
  'כיתה ח\'': 'ח',
  'כיתה ט\'': 'ט',
}

// Grades that require a follow-up question (4 vs 5 יחידות) to determine the favored track.
const NEEDS_TRACK_CHOICE = ['כיתה י\'', 'כיתה י\"א', 'כיתה י\"ב']

export default function BookingModal({ slot, weekKey, weekDates, onClose, onBooked }: Props) {
  const [form, setForm] = useState(() => {
    const saved = readSavedRegistration()
    return {
      studentName: saved?.studentName ?? '',
      parentName: saved?.parentName ?? '',
      phone: saved?.phone ?? '',
      grade: saved?.grade ?? '',
      groupPreference: saved?.grade ? (AUTO_TRACK[saved.grade] ?? '') : '',
    }
  })
  const [prefilled, setPrefilled] = useState(() => !!readSavedRegistration())
  const [submitted, setSubmitted] = useState(false)
  const [submittedSlotLabel, setSubmittedSlotLabel] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const dialogRef = useRef<HTMLDivElement>(null)

  useScrollLock(true)

  // Escape-to-close + focus trap: focus moves into the dialog on open, Tab
  // cycles inside it, and focus returns to the trigger on close.
  useEffect(() => {
    const dialog = dialogRef.current
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialog?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !dialog) return
      const focusables = [...dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea'
      )].filter((el) => !el.hasAttribute('disabled'))
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === dialog)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previouslyFocused?.focus()
    }
  }, [onClose])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.studentName.trim()) e.studentName = 'שדה חובה'
    if (!form.phone.trim()) e.phone = 'שדה חובה'
    else if (!/^0\d{8,9}$/.test(form.phone.replace(/[-\s]/g, ''))) e.phone = 'מספר לא תקין'
    if (!form.grade) e.grade = 'שדה חובה'
    else if (!form.groupPreference) e.groupPreference = 'שדה חובה'
    return e
  }

  const onGradeChange = (grade: string) => {
    setForm({ ...form, grade, groupPreference: AUTO_TRACK[grade] ?? '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    const dayDate = weekDates[slot.day]
    const slotLabel = `יום ${dayLabel(slot.day)} ${formatShortDate(dayDate)} | ${slot.time}–${slot.endTime}`

    setLoading(true)
    setSubmitError('')
    try {
      await submitBooking({ slotId: slot.id, weekKey, slotLabel, ...form })
      saveRegistration({
        studentName: form.studentName,
        parentName: form.parentName,
        phone: form.phone,
        grade: form.grade,
      })
      setSubmittedSlotLabel(slotLabel)
      setSubmitted(true)
      window.dispatchEvent(new Event('slotsUpdated'))
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'שמירת הבקשה נכשלה, נסו שוב')
    } finally {
      setLoading(false)
    }
  }

  const handleClearSaved = () => {
    clearSavedRegistration()
    setPrefilled(false)
    setForm((f) => ({ ...f, studentName: '', parentName: '', phone: '', grade: '' }))
  }

  const dayName = dayLabel(slot.day)
  const dayDate = weekDates[slot.day]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="בקשת שריון מקום"
        tabIndex={-1}
        className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl fade-in-up overflow-hidden outline-none"
      >
        {/* Header */}
        <div className="bg-slate-50 px-5 py-4 flex items-center justify-between border-b border-slate-200">
          <div>
            <h3 className="font-black text-slate-900 text-lg">בקשת שריון מקום</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              יום {dayName} {formatShortDate(dayDate)} | <span dir="ltr">{slot.time}–{slot.endTime}</span> | {GROUP_LABELS[slot.groupType]}
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

        {submitted ? (
          <div className="p-6 sm:p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 text-green-600 flex items-center justify-center text-4xl mx-auto mb-4">
              ✓
            </div>
            <h4 className="text-xl font-black text-slate-900 mb-2">הבקשה נשלחה!</h4>
            <p className="text-slate-500 mb-4 leading-relaxed">
              שחר יחזור אליכם בהקדם לאישור המקום ותיאום הפרטים.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-3 text-sm text-right space-y-2">
              <SummaryRow label="תלמיד" value={`${form.studentName} · ${form.grade}`} />
              <SummaryRow
                label="מועד"
                value={<>יום {dayName} {formatShortDate(dayDate)} · <span dir="ltr">{slot.time}–{slot.endTime}</span></>}
              />
              <SummaryRow label="מסלול" value={form.groupPreference} />
              <SummaryRow label="טלפון" value={<span dir="ltr">{form.phone}</span>} />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-sm text-blue-800 leading-relaxed text-right">
              <strong>שימו לב:</strong> השריון זמני עד לאישור טלפוני של שחר.
            </div>

            <button
              onClick={() => downloadIcs('shahar-lesson.ics', buildLessonIcs({
                date: dayDate,
                time: slot.time,
                endTime: slot.endTime,
                studentName: form.studentName,
              }))}
              className="flex items-center justify-center gap-2 w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
            >
              📅 הוסיפו ליומן
            </button>
            <a
              href={adminWhatsappUrl(form.studentName, form.grade, submittedSlotLabel, form.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors text-sm"
            >
              💬 שלח הודעה לשחר (לא חובה)
            </a>
            <p className="mt-1.5 text-[11px] text-slate-400">שחר כבר קיבל התראה על הבקשה — זו רק דרך מהירה ליצור איתו קשר ישיר.</p>
            <button
              onClick={onBooked}
              className="mt-3 w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
            >
              סגור
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {prefilled && (
              <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600">
                <span>הפרטים מולאו אוטומטית מהרישום הקודם שלכם</span>
                <button
                  type="button"
                  onClick={handleClearSaved}
                  className="shrink-0 text-slate-500 hover:text-slate-800 font-semibold underline underline-offset-2"
                >
                  ✕ נקה
                </button>
              </div>
            )}

            <Field label="שם מלא" error={errors.studentName}>
              <input
                type="text"
                placeholder="ישראל ישראלי"
                value={form.studentName}
                onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                className="input-field"
              />
            </Field>

            <Field label="טלפון ליצירת קשר" error={errors.phone}>
              <input
                type="tel"
                placeholder="05X-XXXXXXX"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field"
                dir="ltr"
              />
            </Field>

            <Field label="כיתה" error={errors.grade}>
              <select
                value={form.grade}
                onChange={(e) => onGradeChange(e.target.value)}
                className="input-field"
              >
                <option value="">בחרו כיתה</option>
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </Field>

            {NEEDS_TRACK_CHOICE.includes(form.grade) && (
              <Field label="מסלול מועדף" error={errors.groupPreference}>
                <select
                  value={form.groupPreference}
                  onChange={(e) => setForm({ ...form, groupPreference: e.target.value })}
                  className="input-field"
                >
                  <option value="">בחרו מסלול</option>
                  <option value="4 יחידות">4 יחידות</option>
                  <option value="5 יחידות">5 יחידות</option>
                </select>
              </Field>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800 leading-relaxed">
              <strong>שימו לב:</strong> שריון המקום הוא זמני. שחר יחזור אליכם טלפונית תוך מספר שעות לתיאום המחיר המותאם עבורכם ואישור סופי של ההרשמה.
            </div>

            {submitError && (
              <p className="text-sm text-red-600 text-center">{submitError}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 text-white font-black text-base rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 disabled:opacity-60"
            >
              {loading ? 'שולח...' : 'שלח בקשת שריון ←'}
            </button>
          </form>
        )}
      </div>

      <style jsx>{`
        .input-field {
          width: 100%;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 10px 12px;
          color: #1e293b;
          font-family: inherit;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input-field:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }
        .input-field option {
          background: #ffffff;
          color: #1e293b;
        }
      `}</style>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-900 font-semibold">{value}</span>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
