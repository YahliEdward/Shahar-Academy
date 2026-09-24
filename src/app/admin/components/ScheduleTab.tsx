'use client'

import { useState, useEffect } from 'react'
import {
  Slot, Booking, GroupType, DayIndex, FRIDAY_DAY, MOTZASH_DAY, OVER_CAPACITY_LIMIT, TEMPLATE_KEY,
  addSlotToDay, removeSlot, getWeekKey, getWeekDates, formatShortDate, dayLabel,
} from '@/lib/types'
import { fetchTemplate, fetchWeekSlots, putTemplate, putWeekSlots, resetWeek } from '@/lib/adminApi'
import WeekMiniGrid from './WeekMiniGrid'
import SlotEditorCard from './SlotEditorCard'
import StudentsModal from './StudentsModal'
import RemoveStudentModal from './RemoveStudentModal'
import { useToast } from './ui/Toast'
import { useConfirm } from './ui/ConfirmDialog'

const MAX_WEEK_OFFSET = 3

type EditMode = 'default' | 'week'

export default function ScheduleTab({ bookings, onChanged, defaultMode = 'week' }: {
  bookings: Booking[]
  onChanged: () => void
  defaultMode?: EditMode
}) {
  const toast = useToast()
  const confirmDialog = useConfirm()
  const [mode, setMode] = useState<EditMode>(defaultMode)
  const [weekOffset, setWeekOffset] = useState(0)
  const [activeDay, setActiveDay] = useState(0)
  const [slots, setSlots] = useState<Slot[]>([])
  const [isOverride, setIsOverride] = useState(false)
  // Which edit target (template / specific week) the current slots belong to.
  // Deriving `loading` from it avoids a synchronous setState inside the effect.
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  // Which slot's students popup is open, and why: the card itself opens the
  // roster, "+" jumps straight to the add form, "−" opens the removal picker.
  const [studentsPopup, setStudentsPopup] = useState<{ slot: Slot; action: 'view' | 'add' | 'remove' } | null>(null)

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
  }, [mode, weekKey, reloadKey])

  // Persist the current edit: the default schedule, or a single week's override.
  const commit = async (updated: Slot[]) => {
    setSlots(updated)
    try {
      if (mode === 'default') {
        await putTemplate(updated)
      } else {
        await putWeekSlots(weekKey, updated)
        setIsOverride(true)
      }
      toast('נשמר ✓')
      onChanged()
    } catch {
      toast('שגיאה בשמירה — נסו שוב', 'error')
      // Re-fetch the current edit target so the optimistic state doesn't drift.
      setLoadedFor(null)
      setReloadKey((k) => k + 1)
    }
  }

  const setGroupType = (id: string, groupType: GroupType) =>
    commit(slots.map((s) => s.id === id ? { ...s, groupType } : s))

  const clampEnrolled = (n: number) => Math.max(0, Math.min(OVER_CAPACITY_LIMIT, n))

  // What the card shows: in template mode, the count of standing (recurring)
  // students registered directly to this slot — not a specific week's seats.
  const displaySlot = (slot: Slot): Slot => {
    if (mode !== 'default') return slot
    const standingCount = bookings.filter((b) => b.weekKey === TEMPLATE_KEY && b.slotId === slot.id).length
    return { ...slot, enrolled: clampEnrolled(standingCount) }
  }

  // Adding/removing a standing student changes bookings for every week it's
  // cloned into — re-pull so the meter and this week's roster reflect it.
  const handleStudentsChanged = () => {
    onChanged()
    setReloadKey((k) => k + 1)
  }

  const handleAddSlot = () => commit(addSlotToDay(slots, activeDay as DayIndex))

  const handleAddMotzash = () => {
    commit(addSlotToDay(slots, MOTZASH_DAY))
    setActiveDay(MOTZASH_DAY)
  }

  // The students shown on a slot's card: standing masters in template mode,
  // this week's rows otherwise.
  const slotStudents = (slotId: string) => {
    const targetKey = mode === 'default' ? TEMPLATE_KEY : weekKey
    return bookings.filter((b) => b.slotId === slotId && b.weekKey === targetKey)
  }

  // One tap on "×" from a phone is easy to hit by accident — always confirm,
  // and say so plainly when students are registered to the slot.
  const handleRemoveSlot = async (id: string) => {
    const removed = slots.find((s) => s.id === id)
    if (!removed) return
    const studentCount = slotStudents(id).length
    // LRI/PDI isolate the time range so the RTL sentence doesn't flip it to "16:00–15:00".
    const when = `יום ${dayLabel(removed.day)} ⁦${removed.time}–${removed.endTime}⁩`
    const scope = mode === 'default' ? 'מהלוח הקבוע (מכל השבועות)' : 'מהשבוע הזה בלבד'
    if (!(await confirmDialog({
      title: 'להסיר את השעה?',
      message: studentCount > 0
        ? `השעה ${when} תוסר ${scope}. שימו לב: רשומים אליה ${studentCount} תלמידים.`
        : `השעה ${when} תוסר ${scope}.`,
      confirmLabel: 'הסר שעה',
      danger: true,
    }))) return
    const updated = removeSlot(slots, id)
    commit(updated)
    if (removed?.day === MOTZASH_DAY && !updated.some((s) => s.day === MOTZASH_DAY)) {
      setActiveDay(0)
    }
  }

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
    if (!(await confirmDialog({
      title: 'להחזיר שבוע זה ללוח הקבוע?',
      message: 'כל השינויים הנקודתיים של השבוע יימחקו.',
      confirmLabel: 'החזר לברירת מחדל',
      danger: true,
    }))) return
    try {
      await resetWeek(weekKey)
      const { slots: weekSlots } = await fetchWeekSlots(weekKey)
      setIsOverride(false)
      setSlots(weekSlots)
      toast('השבוע הוחזר ללוח הקבוע ✓')
      onChanged()
    } catch {
      toast('שגיאה — נסו שוב', 'error')
    }
  }

  const daySlots = slots.filter((s) => s.day === activeDay)
  const weekRange = `${formatShortDate(weekDates[0])}–${formatShortDate(weekDates[5])}`

  return (
    <div>
      {/* Mode segmented control */}
      <div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-xl">
        {([
          { key: 'week', label: 'שבוע ספציפי', sub: 'חריגה חד-פעמית' },
          { key: 'default', label: 'לוח קבוע', sub: 'חל על כל שבוע' },
        ] as { key: EditMode; label: string; sub: string }[]).map((opt) => (
          <button
            key={opt.key}
            onClick={() => setMode(opt.key)}
            className={`flex-1 px-4 py-2 rounded-lg transition-all ${
              mode === opt.key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className="font-bold text-sm">{opt.label}</div>
            <div className={`text-[10px] ${mode === opt.key ? 'text-white/80' : 'text-slate-400'}`}>{opt.sub}</div>
          </button>
        ))}
      </div>

      {/* Context banner */}
      {mode === 'default' ? (
        <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 px-4 py-2.5 text-xs text-blue-800">
          שינויים כאן חלים אוטומטית על כל שבוע שלא שונה ידנית. תלמיד שנוסיף לשעה כאן הוא תלמיד קבוע — הוא יופיע אוטומטית בכל שבוע (השבוע הנוכחי וקדימה), עד שיוסר.
        </div>
      ) : (
        <>
          {/* Week navigation */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
              disabled={weekOffset === 0}
              className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold flex items-center justify-center"
            >
              →
            </button>
            <span className="text-sm font-semibold text-slate-700 flex-1 text-center">
              {weekOffset === 0 ? 'שבוע נוכחי' : 'שבוע'} (<span dir="ltr">{weekRange}</span>)
            </span>
            <button
              onClick={() => setWeekOffset((w) => Math.min(MAX_WEEK_OFFSET, w + 1))}
              disabled={weekOffset === MAX_WEEK_OFFSET}
              className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold flex items-center justify-center"
            >
              ←
            </button>
          </div>

          {isOverride ? (
            <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-blue-800">✏️ שבוע זה שונה מהלוח הקבוע.</p>
              <button
                onClick={handleResetWeek}
                className="text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors font-semibold whitespace-nowrap"
              >
                החזר לברירת מחדל
              </button>
            </div>
          ) : (
            <div className="mb-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-xs text-slate-500">
              📋 שבוע זה עוקב אחרי הלוח הקבוע — כל שינוי ייצור גרסה לשבוע זה בלבד.
            </div>
          )}
        </>
      )}

      {/* Week overview / day selector */}
      <WeekMiniGrid
        slots={slots}
        activeDay={activeDay}
        onSelectDay={setActiveDay}
        onAddMotzash={handleAddMotzash}
        mode={mode}
        weekDates={weekDates}
        bookings={bookings}
        weekKey={weekKey}
        isCurrentWeek={weekOffset === 0}
      />

      {/* Slot list */}
      {loading ? (
        <p className="text-center text-slate-400 py-8 text-sm">טוען…</p>
      ) : loadError ? (
        <p className="text-center text-red-600 py-8 text-sm">שגיאה בטעינת הלוח — נסו לרענן</p>
      ) : (
        <div className="space-y-3">
          {daySlots.map((slot) => (
            <SlotEditorCard
              key={slot.id}
              slot={displaySlot(slot)}
              students={slotStudents(slot.id)}
              showStudents
              showOrigin={mode !== 'default'}
              canRemove={activeDay === MOTZASH_DAY || activeDay === FRIDAY_DAY ? true : daySlots.length > 1}
              onTimeChange={(field, value) => updateSlotTime(slot.id, field, value)}
              onGroupChange={(g) => setGroupType(slot.id, g)}
              onAddStudent={() => setStudentsPopup({ slot, action: 'add' })}
              onRemoveStudent={() => setStudentsPopup({ slot, action: 'remove' })}
              onRemove={() => handleRemoveSlot(slot.id)}
              onShowStudents={() => setStudentsPopup({ slot, action: 'view' })}
            />
          ))}

          <button
            onClick={handleAddSlot}
            className="mt-1 w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-all text-sm font-semibold"
          >
            + הוסף שעה ליום זה
          </button>
        </div>
      )}

      {studentsPopup && (
        studentsPopup.action === 'remove' ? (
          <RemoveStudentModal
            slot={studentsPopup.slot}
            weekKey={mode === 'default' ? TEMPLATE_KEY : weekKey}
            date={mode === 'default' ? undefined : weekDates[studentsPopup.slot.day]}
            standing={mode === 'default'}
            bookings={bookings}
            onClose={() => setStudentsPopup(null)}
            onChanged={handleStudentsChanged}
          />
        ) : (
          <StudentsModal
            slot={studentsPopup.slot}
            weekKey={mode === 'default' ? TEMPLATE_KEY : weekKey}
            date={mode === 'default' ? undefined : weekDates[studentsPopup.slot.day]}
            standing={mode === 'default'}
            autoOpenAdd={studentsPopup.action === 'add'}
            bookings={bookings}
            onClose={() => setStudentsPopup(null)}
            onChanged={handleStudentsChanged}
          />
        )
      )}
    </div>
  )
}
