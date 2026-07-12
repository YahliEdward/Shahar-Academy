'use client'

import { useState, useEffect, useRef } from 'react'
import { Slot, GroupType, GROUP_LABELS, dayLabel, formatShortDate } from '@/lib/types'
import { submitBooking } from '@/lib/adminApi'
import { WHATSAPP_NUMBER } from '@/lib/constants'
import { buildLessonIcs, downloadIcs } from '@/lib/ics'

const adminWhatsappUrl = (studentName: string, grade: string, slotLabel: string, phone: string) => {
  const msg = encodeURIComponent(
    `הרשמה חדשה! 📚\n` +
    `תלמיד: ${studentName} (${grade})\n` +
    `שיעור: ${slotLabel}\n` +
    `טלפון הורה: ${phone}`
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

export default function BookingModal({ slot, weekKey, weekDates, onClose, onBooked }: Props) {
  const [form, setForm] = useState({
    studentName: '',
    parentName: '',
    phone: '',
    grade: '',
    groupPreference: (slot.groupType === 'empty' ? 'middle-school' : slot.groupType) as GroupType,
  })
  const [submitted, setSubmitted] = useState(false)
  const [submittedSlotLabel, setSubmittedSlotLabel] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const dialogRef = useRef<HTMLDivElement>(null)

  // Scroll lock + Escape-to-close + focus trap: focus moves into the dialog on
  // open, Tab cycles inside it, and focus returns to the trigger on close.
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

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
      previouslyFocused?.focus()
    }
  }, [onClose])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.studentName.trim()) e.studentName = 'שדה חובה'
    if (!form.parentName.trim()) e.parentName = 'שדה חובה'
    if (!form.phone.trim()) e.phone = 'שדה חובה'
    else if (!/^0\d{8,9}$/.test(form.phone.replace(/[-\s]/g, ''))) e.phone = 'מספר לא תקין'
    if (!form.grade) e.grade = 'שדה חובה'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    const dayDate = weekDates[slot.day]
    const slotLabel = `יום ${dayLabel(slot.day)} ${formatShortDate(dayDate)} | ${slot.time}–${slot.endTime}`

    setLoading(true)
    setSubmitError('')
    try {
      await submitBooking({ slotId: slot.id, weekKey, slotLabel, ...form })
      setSubmittedSlotLabel(slotLabel)
      setSubmitted(true)
      window.dispatchEvent(new Event('slotsUpdated'))
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'שמירת הבקשה נכשלה, נסו שוב')
    } finally {
      setLoading(false)
    }
  }

  const dayName = dayLabel(slot.day)
  const dayDate = weekDates[slot.day]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="שריון מקום"
        tabIndex={-1}
        className="w-full max-w-md bg-[#131827] rounded-2xl border border-zinc-700/50 shadow-2xl fade-in-up overflow-hidden outline-none"
      >
        {/* Header */}
        <div className="bg-zinc-800/60 px-5 py-4 flex items-center justify-between border-b border-zinc-700/50">
          <div>
            <h3 className="font-black text-white text-lg">שריון מקום</h3>
            <p className="text-sm text-zinc-400 mt-0.5">
              יום {dayName} {formatShortDate(dayDate)} | <span dir="ltr">{slot.time}–{slot.endTime}</span> | {GROUP_LABELS[slot.groupType]}
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

        {submitted ? (
          <div className="p-6 sm:p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-400/20 flex items-center justify-center text-4xl mx-auto mb-4">
              ✓
            </div>
            <h4 className="text-xl font-black text-white mb-2">הבקשה נשלחה!</h4>
            <p className="text-slate-400 mb-4 leading-relaxed">
              שחר יחזור אליכם בהקדם לאישור המקום ותיאום הפרטים.
            </p>

            <div className="bg-[#1e2535] border border-white/10 rounded-xl p-4 mb-3 text-sm text-right space-y-2">
              <SummaryRow label="תלמיד" value={`${form.studentName} · ${form.grade}`} />
              <SummaryRow
                label="מועד"
                value={<>יום {dayName} {formatShortDate(dayDate)} · <span dir="ltr">{slot.time}–{slot.endTime}</span></>}
              />
              <SummaryRow label="קבוצה" value={GROUP_LABELS[form.groupPreference]} />
              <SummaryRow label="טלפון" value={<span dir="ltr">{form.phone}</span>} />
            </div>

            <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-3 mb-4 text-xs text-yellow-200 leading-relaxed text-right">
              <strong>שימו לב:</strong> השריון זמני עד לאישור טלפוני של שחר.
            </div>

            <button
              onClick={() => downloadIcs('shahar-lesson.ics', buildLessonIcs({
                date: dayDate,
                time: slot.time,
                endTime: slot.endTime,
                studentName: form.studentName,
              }))}
              className="flex items-center justify-center gap-2 w-full py-3 bg-[#1e2535] hover:bg-[#252d42] border border-white/10 text-white font-bold rounded-xl transition-colors text-sm"
            >
              📅 הוסיפו ליומן
            </button>
            <a
              href={adminWhatsappUrl(form.studentName, form.grade, submittedSlotLabel, form.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 w-full py-3 bg-green-700 hover:bg-green-600 text-white font-bold rounded-xl transition-colors text-sm"
            >
              💬 שלח הודעה לשחר
            </a>
            <button
              onClick={onBooked}
              className="mt-3 w-full py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 transition-colors"
            >
              סגור
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <Field label="שם התלמיד" error={errors.studentName}>
              <input
                type="text"
                placeholder="ישראל ישראלי"
                value={form.studentName}
                onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                className="input-field"
              />
            </Field>

            <Field label="שם ההורה" error={errors.parentName}>
              <input
                type="text"
                placeholder="שם מלא"
                value={form.parentName}
                onChange={(e) => setForm({ ...form, parentName: e.target.value })}
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
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
                className="input-field"
              >
                <option value="">בחרו כיתה</option>
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </Field>

            <Field label="סוג קבוצה מועדף">
              <select
                value={form.groupPreference}
                onChange={(e) => setForm({ ...form, groupPreference: e.target.value as GroupType })}
                className="input-field"
              >
                <option value="middle-school">{GROUP_LABELS['middle-school']}</option>
                <option value="high-4">{GROUP_LABELS['high-4']}</option>
                <option value="high-5">{GROUP_LABELS['high-5']}</option>
                <option value="mixed">{GROUP_LABELS['mixed']}</option>
              </select>
            </Field>

            <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-3 text-xs text-yellow-200 leading-relaxed">
              <strong>שימו לב:</strong> שריון המקום הוא זמני. שחר יחזור אליכם טלפונית תוך מספר שעות לתיאום המחיר המותאם עבורכם ואישור סופי של ההרשמה.
            </div>

            {submitError && (
              <p className="text-sm text-red-400 text-center">{submitError}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-yellow-400 text-black font-black text-base rounded-xl hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20 hover:shadow-yellow-400/40 disabled:opacity-60"
            >
              {loading ? 'שולח...' : 'שלח בקשת שריון ←'}
            </button>
          </form>
        )}
      </div>

      <style jsx>{`
        .input-field {
          width: 100%;
          background: #1e2535;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 10px 12px;
          color: #f1f5f9;
          font-family: inherit;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-field:focus {
          border-color: #facc15;
        }
        .input-field option {
          background: #131827;
          color: #f1f5f9;
        }
      `}</style>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span className="text-slate-100 font-semibold">{value}</span>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-300 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}
