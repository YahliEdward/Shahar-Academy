'use client'

import { useEffect, useRef, useState } from 'react'
import { Slot, Booking, GroupType, dayLabel, GROUP_LABELS } from '@/lib/types'
import { removeBooking, patchBooking, adminCreateBooking } from '@/lib/adminApi'
import { whatsappUrl } from '../lib'
import { useToast } from './ui/Toast'
import { useConfirm } from './ui/ConfirmDialog'

const GRADE_OPTIONS = [
  'כיתה ח\'', 'כיתה ט\'',
  'כיתה י\'', 'כיתה י\"א', 'כיתה י\"ב',
]

const GROUP_OPTIONS: GroupType[] = ['middle-school', 'high-4', 'high-5', 'mixed']

const inputClass = 'w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-yellow-400 transition-colors'

type StudentDraft = {
  studentName: string
  parentName: string
  phone: string
  grade: string
  groupPreference: GroupType
}

function draftFromBooking(b: Booking): StudentDraft {
  return {
    studentName: b.studentName,
    parentName: b.parentName,
    phone: b.phone,
    grade: b.grade,
    groupPreference: b.groupPreference,
  }
}

function emptyDraft(defaultGroup: GroupType): StudentDraft {
  return { studentName: '', parentName: '', phone: '', grade: '', groupPreference: defaultGroup }
}

// Only the name is required here — everything else is optional but still
// editable, unlike the public booking form which requires all of it.
function validatePhone(phone: string): string | null {
  if (!phone.trim()) return null
  return /^0\d{8,9}$/.test(phone.replace(/[-\s]/g, '')) ? null : 'מספר לא תקין'
}

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

  const defaultGroup: GroupType = slot.groupType === 'empty' ? 'middle-school' : slot.groupType

  const [adding, setAdding] = useState(false)
  const [addDraft, setAddDraft] = useState<StudentDraft>(() => emptyDraft(defaultGroup))
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

  const submitAdd = async () => {
    const errors: { studentName?: string; phone?: string } = {}
    if (!addDraft.studentName.trim()) errors.studentName = 'שדה חובה'
    const phoneError = validatePhone(addDraft.phone)
    if (phoneError) errors.phone = phoneError
    if (Object.keys(errors).length > 0) {
      setAddError(errors)
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
      })
      toast('התלמיד נוסף ✓')
      setAddDraft(emptyDraft(defaultGroup))
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
    setEditLoading(true)
    try {
      await patchBooking(id, {
        studentName: editDraft.studentName.trim(),
        parentName: editDraft.parentName.trim(),
        phone: editDraft.phone.trim(),
        grade: editDraft.grade,
        groupPreference: editDraft.groupPreference,
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
              יום {dayLabel(slot.day)} | <span dir="ltr">{slot.time}–{slot.endTime}</span> | {GROUP_LABELS[slot.groupType]}
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
          {students.length === 0 && !adding && (
            <p className="text-center text-zinc-500 py-8 text-sm">אין תלמידים רשומים עדיין</p>
          )}

          {students.map((b) => (
            <div
              key={b.id}
              className={`rounded-xl border p-4 ${b.status === 'confirmed' ? 'border-green-500/30 bg-green-900/10' : 'border-zinc-700/50 bg-zinc-800/40'}`}
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
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => saveEdit(b.id)}
                      disabled={editLoading}
                      className="flex-1 py-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-black font-bold rounded-lg text-sm transition-colors"
                    >
                      {editLoading ? 'שומר…' : 'שמור'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={editLoading}
                      className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-semibold rounded-lg text-sm transition-colors"
                    >
                      בטול
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-bold text-white">{b.studentName}</div>
                      <div className="text-xs text-zinc-400">{b.grade || 'כיתה לא צוינה'} | {GROUP_LABELS[b.groupPreference]}</div>
                      <span className={`inline-block mt-1 text-xs rounded px-2 py-0.5 ${b.status === 'confirmed' ? 'bg-green-900/50 text-green-300 border border-green-700/40' : 'bg-zinc-700 text-zinc-200'}`}>
                        {b.status === 'confirmed' ? 'מאושר' : 'ממתין לאישור'}
                      </span>
                    </div>
                    {b.phone && (
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
                    )}
                  </div>
                  {b.price && (
                    <div className="text-xs text-zinc-400 mt-2">מחיר: {b.price}</div>
                  )}
                  <div className="text-xs text-zinc-600 mt-2 flex items-center justify-between gap-3 flex-wrap">
                    <span>הורה: {b.parentName || 'לא צוין'} | נשלח: {new Date(b.createdAt).toLocaleString('he-IL')}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(b)}
                        className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg text-xs transition-colors border border-zinc-600/60"
                      >
                        ערוך
                      </button>
                      <button
                        onClick={() => remove(b)}
                        className="px-3 py-1.5 bg-red-900/40 hover:bg-red-800/60 text-red-400 rounded-lg text-xs transition-colors border border-red-800/40"
                      >
                        הסר תלמיד
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}

          {adding ? (
            <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/5 p-4 space-y-2.5">
              <p className="text-sm font-bold text-yellow-200 mb-1">הוספת תלמיד</p>
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
              <div className="flex gap-2 pt-1">
                <button
                  onClick={submitAdd}
                  disabled={addLoading}
                  className="flex-1 py-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-black font-bold rounded-lg text-sm transition-colors"
                >
                  {addLoading ? 'מוסיף…' : 'הוסף תלמיד'}
                </button>
                <button
                  onClick={() => { setAdding(false); setAddError({}) }}
                  disabled={addLoading}
                  className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-semibold rounded-lg text-sm transition-colors"
                >
                  בטול
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full py-2.5 rounded-xl border border-dashed border-zinc-600 text-zinc-400 hover:border-yellow-400/50 hover:text-yellow-400 transition-all text-sm font-semibold"
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
      <label className="block text-xs font-semibold text-zinc-400 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}
