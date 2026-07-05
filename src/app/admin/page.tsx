'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Slot, Booking, GroupType, DayIndex, DAYS, GROUP_LABELS, MAX_STUDENTS,
  addSlotToDay, removeSlot, getWeekKey, getWeekDates, formatShortDate,
} from '@/lib/types'
import {
  adminLogin, adminLogout, adminSession, fetchBookings, patchBooking, removeBooking,
  fetchTemplate, fetchWeekSlots, putTemplate, putWeekSlots, resetWeek,
} from '@/lib/adminApi'
import TimePicker from '@/components/TimePicker'
import ShaharLogo from '@/components/ShaharLogo'
import PushToggle from '@/components/PushToggle'

const MAX_WEEK_OFFSET = 3

const GROUP_OPTIONS: GroupType[] = ['middle-school', 'high-4', 'high-5', 'mixed', 'empty']

const whatsappUrl = (phone: string, name: string) => {
  const num = phone.replace(/[^0-9]/g, '').replace(/^0/, '972')
  const msg = encodeURIComponent(`שלום! זה שחר מהאקדמיה למתמטיקה. קיבלתי את הבקשה עבור ${name}. אשמח לתאם את הפרטים :)`)
  return `https://wa.me/${num}?text=${msg}`
}

// ─── Auth screen ───────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { ok, error: loginError } = await adminLogin(pw)
    setLoading(false)
    if (ok) onLogin()
    else setError(loginError ?? 'סיסמה שגויה')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 math-bg">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700/50 rounded-2xl p-8 text-center shadow-2xl">
        <div className="flex justify-center mb-5">
          <Link href="/" aria-label="חזרה לדף הבית">
            <ShaharLogo size={72} />
          </Link>
        </div>
        <h1 className="text-xl font-black text-white mb-1">אזור המורים</h1>
        <p className="text-sm text-zinc-400 mb-6">כניסה מוגבלת לשחר בלבד</p>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="password"
            placeholder="סיסמה"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setError('') }}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-center tracking-widest text-lg outline-none focus:border-yellow-400 transition-colors"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-yellow-400 text-black font-black rounded-xl hover:bg-yellow-300 transition-colors disabled:opacity-60"
          >
            {loading ? 'בודק…' : 'כניסה'}
          </button>
        </form>
        <Link href="/" className="block mt-4 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          ← חזרה לאתר
        </Link>
      </div>
    </div>
  )
}

// ─── Slot editor ──────────────────────────────────────────────────────────

type EditMode = 'default' | 'week'

function SlotEditor({ bookings, onChanged }: { bookings: Booking[]; onChanged: () => void }) {
  const [mode, setMode] = useState<EditMode>('default')
  const [weekOffset, setWeekOffset] = useState(0)
  const [activeDay, setActiveDay] = useState(0)
  const [slots, setSlots] = useState<Slot[]>([])
  const [isOverride, setIsOverride] = useState(false)
  // Which edit target (template / specific week) the current slots belong to.
  // Deriving `loading` from it avoids a synchronous setState inside the effect.
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [detailSlot, setDetailSlot] = useState<Slot | null>(null)

  const weekKey = getWeekKey(weekOffset)
  const weekDates = getWeekDates(weekOffset)
  const editKey = mode === 'default' ? 'template' : weekKey
  const loading = loadedFor !== editKey

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        if (mode === 'default') {
          const template = await fetchTemplate()
          if (cancelled) return
          setSlots(template)
        } else {
          const { slots: weekSlots, isOverride: hasOverride } = await fetchWeekSlots(weekKey)
          if (cancelled) return
          setSlots(weekSlots)
          setIsOverride(hasOverride)
        }
        setLoadError(false)
      } catch {
        if (cancelled) return
        setLoadError(true)
      } finally {
        if (!cancelled) setLoadedFor(mode === 'default' ? 'template' : weekKey)
      }
    }
    load()
    return () => { cancelled = true }
  }, [mode, weekKey])

  // Persist the current edit: the default schedule, or a single week's override.
  const commit = async (updated: Slot[]) => {
    setSlots(updated)
    if (mode === 'default') {
      await putTemplate(updated)
    } else {
      await putWeekSlots(weekKey, updated)
      setIsOverride(true)
    }
    onChanged()
  }

  const setGroupType = (id: string, groupType: GroupType) =>
    commit(slots.map((s) => s.id === id ? { ...s, groupType } : s))

  const adjustEnrolled = (id: string, delta: number) =>
    commit(slots.map((s) =>
      s.id === id ? { ...s, enrolled: Math.max(0, Math.min(MAX_STUDENTS, s.enrolled + delta)) } : s
    ))

  const handleAddSlot = () => commit(addSlotToDay(slots, activeDay as DayIndex))

  const handleRemoveSlot = (id: string) => commit(removeSlot(slots, id))

  const updateSlotTime = (id: string, field: 'time' | 'endTime', value: string) =>
    commit(slots.map((s) => {
      if (s.id !== id) return s
      if (field === 'time') {
        const [h, m] = value.split(':').map(Number)
        const total = (h * 60 + m + 60) % (24 * 60)
        const endTime = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
        return { ...s, time: value, endTime }
      }
      return { ...s, endTime: value }
    }))

  const handleResetWeek = async () => {
    if (!window.confirm('להחזיר שבוע זה ללוח ברירת המחדל? כל השינויים הנקודתיים של השבוע יימחקו.')) return
    await resetWeek(weekKey)
    const { slots: weekSlots } = await fetchWeekSlots(weekKey)
    setIsOverride(false)
    setSlots(weekSlots)
    onChanged()
  }

  const daySlots = slots.filter((s) => s.day === activeDay)
  const weekRange = `${formatShortDate(weekDates[0])}–${formatShortDate(weekDates[4])}`

  return (
    <div>
      {/* Mode toggle */}
      <div className="flex gap-2 mb-5 bg-zinc-800/50 p-1 rounded-xl">
        <button
          onClick={() => setMode('default')}
          className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
            mode === 'default' ? 'bg-yellow-400 text-black' : 'text-slate-400 hover:text-white'
          }`}
        >
          לוח קבוע (ברירת מחדל)
        </button>
        <button
          onClick={() => setMode('week')}
          className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
            mode === 'week' ? 'bg-yellow-400 text-black' : 'text-slate-400 hover:text-white'
          }`}
        >
          שבוע ספציפי
        </button>
      </div>

      {/* Context banner */}
      {mode === 'default' ? (
        <div className="mb-4 rounded-xl bg-yellow-400/10 border border-yellow-400/30 px-4 py-3 text-xs text-yellow-200 leading-relaxed">
          זהו לוח השעות הקבוע — הוא חל אוטומטית על כל שבוע שלא שונה ידנית. שינויים כאן משפיעים על כל השבועות.
        </div>
      ) : (
        <>
          {/* Week navigation */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
              disabled={weekOffset === 0}
              className="w-8 h-8 rounded-lg bg-zinc-800 text-slate-400 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold flex items-center justify-center"
            >
              →
            </button>
            <span className="text-sm font-semibold text-slate-300 flex-1 text-center">
              {weekOffset === 0 ? 'שבוע נוכחי' : 'שבוע'} (<span dir="ltr">{weekRange}</span>)
            </span>
            <button
              onClick={() => setWeekOffset((w) => Math.min(MAX_WEEK_OFFSET, w + 1))}
              disabled={weekOffset === MAX_WEEK_OFFSET}
              className="w-8 h-8 rounded-lg bg-zinc-800 text-slate-400 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold flex items-center justify-center"
            >
              ←
            </button>
          </div>

          {isOverride ? (
            <div className="mb-4 rounded-xl bg-blue-500/10 border border-blue-500/30 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-blue-200 leading-relaxed">
                ✏️ שבוע זה שונה מלוח ברירת המחדל. השינויים חלים על שבוע זה בלבד.
              </p>
              <button
                onClick={handleResetWeek}
                className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors font-semibold whitespace-nowrap"
              >
                החזר לברירת מחדל
              </button>
            </div>
          ) : (
            <div className="mb-4 rounded-xl bg-zinc-800/40 border border-zinc-700/40 px-4 py-3 text-xs text-zinc-400 leading-relaxed">
              📋 שבוע זה עוקב אחרי לוח ברירת המחדל. כל שינוי כאן ייצור גרסה מיוחדת לשבוע זה בלבד.
            </div>
          )}
        </>
      )}

      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {DAYS.map((day, i) => (
          <button
            key={day}
            onClick={() => setActiveDay(i)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              activeDay === i ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-slate-400 hover:bg-zinc-700'
            }`}
          >
            <div>יום {day}</div>
            {mode === 'week' && (
              <div className={`text-xs font-normal ${activeDay === i ? 'text-black/60' : 'text-slate-600'}`}>
                {formatShortDate(weekDates[i])}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Slot list */}
      {loading ? (
        <p className="text-center text-zinc-500 py-8 text-sm">טוען…</p>
      ) : loadError ? (
        <p className="text-center text-red-400 py-8 text-sm">שגיאה בטעינת הלוח — נסו לרענן</p>
      ) : (
      <div className="space-y-3">
        {daySlots.map((slot) => (
          <div key={slot.id} className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
            {mode === 'week' && (() => {
              const slotStudents = bookings.filter(
                (b) => b.slotId === slot.id && b.weekKey === weekKey
              )
              if (slotStudents.length === 0) return null
              return (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailSlot(slot)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setDetailSlot(slot) }}
                  className="mb-3 pb-3 border-b border-zinc-700/50 cursor-pointer rounded-lg -mx-1 px-1 hover:bg-zinc-700/30 transition-colors"
                >
                  <p className="text-xs text-zinc-500 mb-1.5">תלמידים רשומים (לחצו לפרטים):</p>
                  <div className="flex flex-wrap gap-1">
                    {slotStudents.map((b) => (
                      <span
                        key={b.id}
                        className={`text-xs rounded px-2 py-0.5 ${b.status === 'confirmed' ? 'bg-green-900/50 text-green-300 border border-green-700/40' : 'bg-zinc-700 text-zinc-200'}`}
                      >
                        {b.studentName}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })()}
            <div className="flex items-center justify-between flex-wrap gap-3">
              {/* Time inputs */}
              <div className="flex items-center gap-2 text-sm" style={{ direction: 'ltr' }}>
                <TimePicker
                  value={slot.time}
                  onChange={(v) => updateSlotTime(slot.id, 'time', v)}
                />
                <span className="text-zinc-500">–</span>
                <TimePicker
                  value={slot.endTime}
                  onChange={(v) => updateSlotTime(slot.id, 'endTime', v)}
                />
              </div>

              <select
                value={slot.groupType}
                onChange={(e) => setGroupType(slot.id, e.target.value as GroupType)}
                className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-yellow-400 transition-colors"
              >
                {GROUP_OPTIONS.map((g) => (
                  <option key={g} value={g}>{GROUP_LABELS[g]}</option>
                ))}
              </select>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => adjustEnrolled(slot.id, -1)}
                  disabled={slot.enrolled <= 0}
                  className="w-8 h-8 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 text-white font-bold transition-colors text-lg"
                >
                  −
                </button>
                <div className="text-center min-w-[70px]">
                  <div className="text-white font-black text-lg">{slot.enrolled}/{MAX_STUDENTS}</div>
                  <div className="flex gap-0.5 mt-1">
                    {Array.from({ length: MAX_STUDENTS }).map((_, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full ${i < slot.enrolled ? 'bg-yellow-400' : 'bg-zinc-600'}`} />
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => adjustEnrolled(slot.id, 1)}
                  disabled={slot.enrolled >= MAX_STUDENTS}
                  className="w-8 h-8 rounded-lg bg-yellow-400 hover:bg-yellow-300 disabled:opacity-30 text-black font-bold transition-colors text-lg"
                >
                  +
                </button>

                {/* Remove slot */}
                {daySlots.length > 1 && (
                  <button
                    onClick={() => handleRemoveSlot(slot.id)}
                    title="הסר שעה"
                    className="w-8 h-8 rounded-lg bg-red-900/40 hover:bg-red-800/60 text-red-400 font-bold transition-colors text-sm border border-red-800/40"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Add slot button */}
        <button
          onClick={handleAddSlot}
          className="mt-1 w-full py-2.5 rounded-xl border border-dashed border-zinc-600 text-zinc-400 hover:border-yellow-400/50 hover:text-yellow-400 transition-all text-sm font-semibold"
        >
          + הוסף שעה ליום זה
        </button>
      </div>
      )}

      {detailSlot && (
        <StudentsModal
          slot={detailSlot}
          weekKey={weekKey}
          bookings={bookings}
          onClose={() => setDetailSlot(null)}
          onChanged={onChanged}
        />
      )}
    </div>
  )
}

// ─── Students modal ───────────────────────────────────────────────────────

function StudentsModal({ slot, weekKey, bookings, onClose, onChanged }: {
  slot: Slot
  weekKey: string
  bookings: Booking[]
  onClose: () => void
  onChanged: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)

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

  const remove = async (id: string) => {
    if (window.confirm('להסיר את התלמיד מהשיעור?')) {
      await removeBooking(id)
      onChanged()
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
                      className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs font-semibold text-white transition-colors"
                    >
                      📞 {b.phone}
                    </a>
                    <a
                      href={whatsappUrl(b.phone, b.studentName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-green-700 hover:bg-green-600 rounded-lg text-xs font-semibold text-white transition-colors"
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
                    onClick={() => remove(b.id)}
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

// ─── Bookings list ────────────────────────────────────────────────────────

function BookingsList({ bookings, slots, onRefresh }: {
  bookings: Booking[]
  slots: Slot[]
  onRefresh: () => void
}) {
  const [prices, setPrices] = useState<Record<string, string>>({})

  const getSlotLabel = (booking: Booking) => {
    if (booking.slotLabel) return booking.slotLabel
    const s = slots.find((sl) => sl.id === booking.slotId)
    if (!s) return booking.slotId
    return `יום ${DAYS[s.day]} ${s.time}–${s.endTime}`
  }

  const confirm = async (b: Booking) => {
    await patchBooking(b.id, { status: 'confirmed', price: prices[b.id] || b.price })
    onRefresh()
  }

  const remove = async (id: string) => {
    if (window.confirm('למחוק את הבקשה?')) {
      await removeBooking(id)
      onRefresh()
    }
  }

  if (bookings.length === 0) {
    return <p className="text-center text-zinc-500 py-10">אין בקשות רישום עדיין</p>
  }

  const pending = bookings.filter((b) => b.status === 'pending')
  const confirmed = bookings.filter((b) => b.status === 'confirmed')

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-yellow-400 mb-3 uppercase tracking-wider">
            ממתין לאישור ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                slotLabel={getSlotLabel(b)}
                price={prices[b.id] ?? b.price ?? ''}
                onPriceChange={(v) => setPrices({ ...prices, [b.id]: v })}
                onConfirm={() => confirm(b)}
                onDelete={() => remove(b.id)}
                whatsappUrl={whatsappUrl(b.phone, b.studentName)}
              />
            ))}
          </div>
        </div>
      )}
      {confirmed.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-green-400 mb-3 uppercase tracking-wider">
            מאושר ({confirmed.length})
          </h3>
          <div className="space-y-3">
            {confirmed.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                slotLabel={getSlotLabel(b)}
                price={prices[b.id] ?? b.price ?? ''}
                onPriceChange={(v) => setPrices({ ...prices, [b.id]: v })}
                onConfirm={() => confirm(b)}
                onDelete={() => remove(b.id)}
                whatsappUrl={whatsappUrl(b.phone, b.studentName)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BookingCard({
  booking, slotLabel, price, onPriceChange, onConfirm, onDelete, whatsappUrl,
}: {
  booking: Booking
  slotLabel: string
  price: string
  onPriceChange: (v: string) => void
  onConfirm: () => void
  onDelete: () => void
  whatsappUrl: string
}) {
  const isConfirmed = booking.status === 'confirmed'
  return (
    <div className={`rounded-xl border p-4 ${isConfirmed ? 'border-green-500/30 bg-green-900/10' : 'border-zinc-700/50 bg-zinc-800/40'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-bold text-white">{booking.studentName}</div>
          <div className="text-xs text-zinc-400">{booking.grade} | {GROUP_LABELS[booking.groupPreference]}</div>
          <div className="text-xs text-zinc-500 mt-0.5">{slotLabel}</div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a
            href={`tel:${booking.phone}`}
            className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs font-semibold text-white transition-colors"
          >
            📞 {booking.phone}
          </a>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-green-700 hover:bg-green-600 rounded-lg text-xs font-semibold text-white transition-colors inline-flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            וואטסאפ
          </a>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs text-zinc-500 block mb-1">מחיר שסוכם (פנימי)</label>
          <input
            type="text"
            placeholder="למשל: 350₪ לחודש"
            value={price}
            onChange={(e) => onPriceChange(e.target.value)}
            className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-yellow-400 transition-colors"
          />
        </div>
        <div className="flex gap-2 mt-4">
          {!isConfirmed && (
            <button
              onClick={onConfirm}
              className="px-4 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-lg text-xs transition-colors"
            >
              ✓ אשר הגעה
            </button>
          )}
          {isConfirmed && (
            <button
              onClick={onConfirm}
              className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-semibold rounded-lg text-xs transition-colors"
            >
              עדכן מחיר
            </button>
          )}
          <button
            onClick={onDelete}
            className="px-3 py-1.5 bg-red-900/40 hover:bg-red-800/60 text-red-400 rounded-lg text-xs transition-colors border border-red-800/40"
          >
            מחק
          </button>
        </div>
      </div>
      <div className="text-xs text-zinc-600 mt-2">
        הורה: {booking.parentName} | נשלח: {new Date(booking.createdAt).toLocaleString('he-IL')}
      </div>
    </div>
  )
}

// ─── Main admin page ──────────────────────────────────────────────────────

export default function AdminPage() {
  // null = still checking whether a previous session cookie is valid.
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [tab, setTab] = useState<'schedule' | 'bookings'>('bookings')
  const [slots, setSlots] = useState<Slot[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])

  useEffect(() => {
    adminSession().then(setAuthed)
  }, [])

  useEffect(() => {
    if (!authed) return
    fetchWeekSlots(getWeekKey(0)).then((r) => setSlots(r.slots)).catch(() => {})
    fetchBookings().then(setBookings).catch(() => {})
  }, [authed])

  useEffect(() => {
    if (!authed) return
    const handler = () => fetchBookings().then(setBookings).catch(() => {})
    window.addEventListener('slotsUpdated', handler)
    return () => window.removeEventListener('slotsUpdated', handler)
  }, [authed])

  const handleScheduleChanged = useCallback(() => {
    fetchWeekSlots(getWeekKey(0)).then((r) => setSlots(r.slots)).catch(() => {})
    window.dispatchEvent(new Event('slotsUpdated'))
  }, [])

  const refreshBookings = () => fetchBookings().then(setBookings).catch(() => {})

  const handleLogout = async () => {
    await adminLogout()
    setAuthed(false)
  }

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center math-bg">
        <p className="text-zinc-500 text-sm">טוען…</p>
      </div>
    )
  }
  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />

  const pendingCount = bookings.filter((b) => b.status === 'pending').length

  return (
    <div className="min-h-screen math-bg">
      {/* Top bar */}
      <header className="bg-zinc-900/80 border-b border-zinc-800 sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="חזרה לדף הבית">
              <ShaharLogo size={40} />
            </Link>
            <span className="font-black text-white">לוח בקרה — שחר</span>
          </div>
          <div className="flex gap-2 items-center">
            <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">← לאתר</Link>
            <button
              onClick={handleLogout}
              className="text-xs px-3 py-1.5 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              יציאה
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <PushToggle />

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('bookings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              tab === 'bookings' ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-slate-400 hover:bg-zinc-700'
            }`}
          >
            בקשות רישום
            {pendingCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-black">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('schedule')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
              tab === 'schedule' ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-slate-400 hover:bg-zinc-700'
            }`}
          >
            ניהול לוח שעות
          </button>
        </div>

        {tab === 'bookings' && (
          <BookingsList bookings={bookings} slots={slots} onRefresh={refreshBookings} />
        )}
        {tab === 'schedule' && (
          <SlotEditor bookings={bookings} onChanged={handleScheduleChanged} />
        )}
      </div>
    </div>
  )
}
