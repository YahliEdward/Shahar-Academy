'use client'

import { useEffect, useRef, useState } from 'react'
import { Slot, Booking, GroupType, dayLabel, formatShortDate, GROUP_LABELS, formatPrice, isFixedBooking } from '@/lib/types'
import { pricePerStudent } from '@/lib/pricing'
import { removeBooking, patchBooking, adminCreateBooking } from '@/lib/adminApi'
import { whatsappUrl } from '../lib'
import { useToast } from './ui/Toast'
import { useConfirm } from './ui/ConfirmDialog'

const GRADE_OPTIONS = [
  'כיתה ח\'', 'כיתה ט\'',
  'כיתה י\'', 'כיתה י\"א', 'כיתה י\"ב',
]

const GROUP_OPTIONS: GroupType[] = ['middle-school', 'high-4', 'high-5', 'mixed']

const inputClass = 'w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors'

type StudentDraft = {
  studentName: string
  parentName: string
  phone: string
  grade: string
  groupPreference: GroupType
  // Kept as a string so the numeric input can be cleared; parsed on save.
  price: string
}

function draftFromBooking(b: Booking): StudentDraft {
  return {
    studentName: b.studentName,
    parentName: b.parentName,
    phone: b.phone,
    grade: b.grade,
    groupPreference: b.groupPreference,
    price: b.price != null ? String(b.price) : '',
  }
}

function emptyDraft(defaultGroup: GroupType, suggestedPrice: number): StudentDraft {
  return { studentName: '', parentName: '', phone: '', grade: '', groupPreference: defaultGroup, price: String(suggestedPrice) }
}

// Parses a price string from the form into the DB shape: '' → null, otherwise a
// non-negative whole ₪ amount. Returns undefined when the input is invalid.
function parsePrice(raw: string): number | null | undefined {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed < 0) return undefined
  return Math.round(parsed)
}

// Only the name is required here — everything else is optional but still
// editable, unlike the public booking form which requires all of it.
function validatePhone(phone: string): string | null {
  if (!phone.trim()) return null
  return /^0\d{8,9}$/.test(phone.replace(/[-\s]/g, '')) ? null : 'מספר לא תקין'
}

export default function StudentsModal({ slot, weekKey, date, standing = false, bookings, onClose, onChanged }: {
  slot: Slot
  weekKey: string
  date?: Date
  // True for "לוח קבוע": students managed here are standing (recurring)
  // enrollments that repeat every week until removed, not a one-time roster.
  standing?: boolean
  bookings: Booking[]
  onClose: () => void
  onChanged: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const toast = useToast()
  const confirmDialog = useConfirm()

  const defaultGroup: GroupType = slot.groupType === 'empty' ? 'middle-school' : slot.groupType

  const students = bookings.filter((b) => b.slotId === slot.id && b.weekKey === weekKey)
  // In "standing" (template) view every row is already a fixed master, so the
  // split is meaningless there — only separate fixed vs. one-time when
  // looking at a specific real week.
  const fixedStudents = standing ? [] : students.filter(isFixedBooking)
  const oneTimeStudents = standing ? students : students.filter((b) => !isFixedBooking(b))

  // Suggested per-student rate from the project pricing rules, based on how many
  // students share the slot. Adding a student grows the group by one; editing an
  // existing one keeps the current size (they're already counted).
  const suggestedForAdd = pricePerStudent(students.length + 1)
  const suggestedForSize = (size: number) => pricePerStudent(Math.max(size, 1))

  const [adding, setAdding] = useState(false)
  const [addDraft, setAddDraft] = useState<StudentDraft>(() => emptyDraft(defaultGroup, suggestedForAdd))
  const [addError, setAddError] = useState<{ studentName?: string; phone?: string }>({})
  const [addLoading, setAddLoading] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<StudentDraft | null>(null)
  const [editError, setEditError] = useState<{ studentName?: string; phone?: string }>({})
  const [editLoading, setEditLoading] = useState(false)

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

  const remove = async (b: Booking) => {
    if (!(await confirmDialog({
      title: 'להסיר את התלמיד מהשיעור?',
      message: standing
        ? `${b.studentName} יוסר מהשעה הזו בכל שבוע (תלמיד קבוע).`
        : `${b.studentName} יוסר מהשיעור.`,
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

  const submitAdd = async () => {
    const errors: { studentName?: string; phone?: string } = {}
    if (!addDraft.studentName.trim()) errors.studentName = 'שדה חובה'
    const phoneError = validatePhone(addDraft.phone)
    if (phoneError) errors.phone = phoneError
    if (Object.keys(errors).length > 0) {
      setAddError(errors)
      return
    }
    const price = parsePrice(addDraft.price)
    if (price === undefined) {
      toast('מחיר לא תקין', 'error')
      return
    }
    setAddLoading(true)
    try {
      await adminCreateBooking({
        slotId: slot.id,
        weekKey,
        studentName: addDraft.studentName.trim(),
        parentName: addDraft.parentName.trim() || undefined,
        phone: addDraft.phone.trim() || undefined,
        grade: addDraft.grade || undefined,
        groupPreference: addDraft.groupPreference,
        price,
      })
      toast('התלמיד נוסף ✓')
      setAddDraft(emptyDraft(defaultGroup, pricePerStudent(students.length + 2)))
      setAddError({})
      setAdding(false)
      onChanged()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'שגיאה בהוספה — נסו שוב', 'error')
    } finally {
      setAddLoading(false)
    }
  }

  const startEdit = (b: Booking) => {
    setEditingId(b.id)
    setEditDraft(draftFromBooking(b))
    setEditError({})
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditDraft(null)
    setEditError({})
  }

  const saveEdit = async (id: string) => {
    if (!editDraft) return
    const errors: { studentName?: string; phone?: string } = {}
    if (!editDraft.studentName.trim()) errors.studentName = 'שדה חובה'
    const phoneError = validatePhone(editDraft.phone)
    if (phoneError) errors.phone = phoneError
    if (Object.keys(errors).length > 0) {
      setEditError(errors)
      return
    }
    const price = parsePrice(editDraft.price)
    if (price === undefined) {
      toast('מחיר לא תקין', 'error')
      return
    }
    setEditLoading(true)
    try {
      await patchBooking(id, {
        studentName: editDraft.studentName.trim(),
        parentName: editDraft.parentName.trim(),
        phone: editDraft.phone.trim(),
        grade: editDraft.grade,
        groupPreference: editDraft.groupPreference,
        price,
      })
      toast('הפרטים עודכנו ✓')
      cancelEdit()
      onChanged()
    } catch {
      toast('שגיאה בשמירה — נסו שוב', 'error')
    } finally {
      setEditLoading(false)
    }
  }

  const renderStudentCard = (b: Booking) => (
    <div
      key={b.id}
      className={`rounded-xl border p-4 ${b.status === 'confirmed' ? 'border-green-300 bg-green-50/60' : 'border-slate-200 bg-slate-50'}`}
    >
      {editingId === b.id && editDraft ? (
        <div className="space-y-2.5">
          <Field label="שם התלמיד" error={editError.studentName}>
            <input
              className={inputClass}
              value={editDraft.studentName}
              onChange={(e) => setEditDraft({ ...editDraft, studentName: e.target.value })}
            />
          </Field>
          <Field label="שם ההורה">
            <input
              className={inputClass}
              value={editDraft.parentName}
              onChange={(e) => setEditDraft({ ...editDraft, parentName: e.target.value })}
            />
          </Field>
          <Field label="טלפון" error={editError.phone}>
            <input
              className={inputClass}
              dir="ltr"
              value={editDraft.phone}
              onChange={(e) => setEditDraft({ ...editDraft, phone: e.target.value })}
            />
          </Field>
          <Field label="כיתה">
            <select
              className={inputClass}
              value={editDraft.grade}
              onChange={(e) => setEditDraft({ ...editDraft, grade: e.target.value })}
            >
              <option value="">לא צוין</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </Field>
          <Field label="סוג קבוצה">
            <select
              className={inputClass}
              value={editDraft.groupPreference}
              onChange={(e) => setEditDraft({ ...editDraft, groupPreference: e.target.value as GroupType })}
            >
              {GROUP_OPTIONS.map((g) => (
                <option key={g} value={g}>{GROUP_LABELS[g]}</option>
              ))}
            </select>
          </Field>
          <Field label="מחיר לשיעור (₪ לתלמיד)">
            <input
              className={inputClass}
              type="number"
              min="0"
              dir="ltr"
              value={editDraft.price}
              onChange={(e) => setEditDraft({ ...editDraft, price: e.target.value })}
            />
            <p className="text-xs text-slate-400 mt-1">
              מומלץ: {formatPrice(suggestedForSize(students.length))} ({students.length} תלמידים)
            </p>
          </Field>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => saveEdit(b.id)}
              disabled={editLoading}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-lg text-sm transition-colors"
            >
              {editLoading ? 'שומר…' : 'שמור'}
            </button>
            <button
              onClick={cancelEdit}
              disabled={editLoading}
              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition-colors"
            >
              בטול
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-bold text-slate-900">{b.studentName}</div>
              <div className="text-xs text-slate-500">{b.grade || 'כיתה לא צוינה'} | {GROUP_LABELS[b.groupPreference]}</div>
              <span className={`inline-block mt-1 text-xs rounded px-2 py-0.5 ${b.status === 'confirmed' ? 'bg-green-50 text-green-700 border border-green-300' : 'bg-white text-slate-600 border border-slate-300'}`}>
                {b.status === 'confirmed' ? 'מאושר' : 'ממתין לאישור'}
              </span>
            </div>
            {b.phone && (
              <div className="flex gap-2 flex-wrap">
                <a
                  href={`tel:${b.phone}`}
                  className="min-h-10 px-3 inline-flex items-center bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
                  dir="ltr"
                >
                  📞 {b.phone}
                </a>
                <a
                  href={whatsappUrl(b.phone, b.studentName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-10 px-3 inline-flex items-center bg-green-600 hover:bg-green-700 rounded-lg text-xs font-semibold text-white transition-colors"
                >
                  וואטסאפ
                </a>
              </div>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            מחיר: {formatPrice(b.price ?? suggestedForSize(students.length))}
            {b.price == null && <span className="text-slate-400"> (מוצע)</span>}
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center justify-between gap-3 flex-wrap">
            <span>הורה: {b.parentName || 'לא צוין'} | נשלח: {new Date(b.createdAt).toLocaleString('he-IL')}</span>
            <div className="flex gap-2">
              <button
                onClick={() => startEdit(b)}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs transition-colors border border-slate-300"
              >
                ערוך
              </button>
              <button
                onClick={() => remove(b)}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs transition-colors border border-red-200"
              >
                הסר תלמיד
              </button>
            </div>
          </div>
        </>
      )}
    </div>
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
        aria-label="תלמידים רשומים"
        tabIndex={-1}
        className="w-full max-w-md max-h-[85vh] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl outline-none"
      >
        <div className="bg-slate-50 px-5 py-4 flex items-center justify-between border-b border-slate-200 sticky top-0">
          <div>
            <h3 className="font-black text-slate-900 text-lg">תלמידים רשומים</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              יום {dayLabel(slot.day)}{date ? ` ${formatShortDate(date)}` : ''} | <span dir="ltr">{slot.time}–{slot.endTime}</span> | {GROUP_LABELS[slot.groupType]}
            </p>
            {standing && (
              <p className="text-xs text-blue-700 mt-1">🔁 תלמידים קבועים — יופיעו אוטומטית בכל שבוע עד שיוסרו</p>
            )}
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
          {students.length === 0 && !adding && (
            <p className="text-center text-slate-400 py-8 text-sm">אין תלמידים רשומים עדיין</p>
          )}

          {standing ? (
            students.map(renderStudentCard)
          ) : (
            <>
              {fixedStudents.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-indigo-700">🔁 תלמידים קבועים ({fixedStudents.length})</p>
                  {fixedStudents.map(renderStudentCard)}
                </div>
              )}
              {oneTimeStudents.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-orange-700">תלמידים חד-פעמיים ({oneTimeStudents.length})</p>
                  {oneTimeStudents.map(renderStudentCard)}
                </div>
              )}
            </>
          )}

          {adding ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-2.5">
              <p className="text-sm font-bold text-blue-800 mb-1">הוספת תלמיד</p>
              <Field label="שם התלמיד" error={addError.studentName}>
                <input
                  className={inputClass}
                  placeholder="שם התלמיד"
                  value={addDraft.studentName}
                  onChange={(e) => setAddDraft({ ...addDraft, studentName: e.target.value })}
                />
              </Field>
              <Field label="שם ההורה (אופציונלי)">
                <input
                  className={inputClass}
                  value={addDraft.parentName}
                  onChange={(e) => setAddDraft({ ...addDraft, parentName: e.target.value })}
                />
              </Field>
              <Field label="טלפון (אופציונלי)" error={addError.phone}>
                <input
                  className={inputClass}
                  dir="ltr"
                  placeholder="05X-XXXXXXX"
                  value={addDraft.phone}
                  onChange={(e) => setAddDraft({ ...addDraft, phone: e.target.value })}
                />
              </Field>
              <Field label="כיתה (אופציונלי)">
                <select
                  className={inputClass}
                  value={addDraft.grade}
                  onChange={(e) => setAddDraft({ ...addDraft, grade: e.target.value })}
                >
                  <option value="">לא צוין</option>
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </Field>
              <Field label="סוג קבוצה">
                <select
                  className={inputClass}
                  value={addDraft.groupPreference}
                  onChange={(e) => setAddDraft({ ...addDraft, groupPreference: e.target.value as GroupType })}
                >
                  {GROUP_OPTIONS.map((g) => (
                    <option key={g} value={g}>{GROUP_LABELS[g]}</option>
                  ))}
                </select>
              </Field>
              <Field label="מחיר לשיעור (₪ לתלמיד)">
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  dir="ltr"
                  value={addDraft.price}
                  onChange={(e) => setAddDraft({ ...addDraft, price: e.target.value })}
                />
                <p className="text-xs text-slate-400 mt-1">
                  מומלץ: {formatPrice(suggestedForAdd)} ({students.length + 1} תלמידים)
                </p>
              </Field>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={submitAdd}
                  disabled={addLoading}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-lg text-sm transition-colors"
                >
                  {addLoading ? 'מוסיף…' : 'הוסף תלמיד'}
                </button>
                <button
                  onClick={() => { setAdding(false); setAddError({}) }}
                  disabled={addLoading}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition-colors"
                >
                  בטול
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setAddDraft(emptyDraft(defaultGroup, suggestedForAdd)); setAdding(true) }}
              className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-all text-sm font-semibold"
            >
              + הוסף תלמיד
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
