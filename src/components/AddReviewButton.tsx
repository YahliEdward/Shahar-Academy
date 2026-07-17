'use client'

import { useState, useEffect, useRef } from 'react'
import { submitTestimonial } from '@/lib/adminApi'

export default function AddReviewButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-5 py-2.5 bg-white border border-slate-200 hover:border-blue-300 text-slate-700 font-bold rounded-xl text-sm transition-colors shadow-sm"
      >
        ✍️ הוסיפו ביקורת
      </button>
      {open && <ReviewModal onClose={() => setOpen(false)} />}
    </>
  )
}

function ReviewModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', text: '' })
  const [stars, setStars] = useState(0)
  const [hoverStars, setHoverStars] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const dialogRef = useRef<HTMLDivElement>(null)

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
    if (!form.name.trim()) e.name = 'שדה חובה'
    if (!form.text.trim()) e.text = 'שדה חובה'
    else if (form.text.trim().length > 500) e.text = 'עד 500 תווים'
    if (stars < 1 || stars > 5) e.stars = 'בחרו דירוג'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setLoading(true)
    setSubmitError('')
    try {
      await submitTestimonial({ name: form.name.trim(), stars, text: form.text.trim() })
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'שליחת הביקורת נכשלה, נסו שוב')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="הוספת ביקורת"
        tabIndex={-1}
        className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl fade-in-up overflow-hidden outline-none"
      >
        <div className="bg-slate-50 px-5 py-4 flex items-center justify-between border-b border-slate-200">
          <h3 className="font-black text-slate-900 text-lg">הוספת ביקורת</h3>
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
            <h4 className="text-xl font-black text-slate-900 mb-2">תודה!</h4>
            <p className="text-slate-500 mb-4 leading-relaxed">
              הביקורת נשלחה ותפורסם באתר לאחר אישור.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
            >
              סגור
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <Field label="שם" error={errors.name}>
              <input
                type="text"
                placeholder="ישראל ישראלי"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field"
              />
            </Field>

            <Field label="דירוג" error={errors.stars}>
              <div className="flex gap-1" dir="ltr">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n} כוכבים`}
                    onClick={() => setStars(n)}
                    onMouseEnter={() => setHoverStars(n)}
                    onMouseLeave={() => setHoverStars(0)}
                    className={`text-2xl leading-none transition-colors ${
                      n <= (hoverStars || stars) ? 'text-amber-400' : 'text-slate-300'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </Field>

            <Field label="הביקורת שלכם" error={errors.text}>
              <textarea
                placeholder="ספרו לנו איך הייתה החוויה..."
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                rows={4}
                className="input-field resize-none"
              />
            </Field>

            {submitError && (
              <p className="text-sm text-red-600 text-center">{submitError}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 text-white font-black text-base rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 disabled:opacity-60"
            >
              {loading ? 'שולח...' : 'שליחת ביקורת'}
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
      `}</style>
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
