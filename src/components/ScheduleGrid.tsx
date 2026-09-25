'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Slot, DayIndex, MOTZASH_DAY, dayLabel, GROUP_LABELS, GROUP_BADGE, MAX_STUDENTS,
  getSlots, getWeekKey, getWeekDates, formatShortDate, isSlotPast,
} from '@/lib/types'
import BookingModal from './BookingModal'
import MyLessons, { useMyLessons } from './MyLessons'

const MAX_WEEK_OFFSET = 3

// One short status line per card, in place of a separate count + badge.
function SlotStatus({ slot, isPast, mine }: { slot: Slot; isPast: boolean; mine: boolean }) {
  const free = MAX_STUDENTS - slot.enrolled
  if (mine) return <span className="font-bold text-green-700">✓ השיעור שלך</span>
  if (isPast) return <span className="text-slate-400">הסתיים</span>
  if (slot.groupType === 'empty') return <span className="font-bold text-emerald-700">פנוי לגמרי</span>
  if (free <= 0) return <span className="text-slate-400">מלא</span>
  if (free === 1) return <span className="font-bold text-blue-700 pulse-badge">נשאר מקום אחד!</span>
  return <span className="font-semibold text-green-700">{free} מקומות פנויים</span>
}

function SlotCard({ slot, isPast, mine, onClick }: { slot: Slot; isPast: boolean; mine: boolean; onClick: () => void }) {
  const isFull = slot.enrolled >= MAX_STUDENTS
  const isEmpty = slot.groupType === 'empty'
  const disabled = isFull || isPast
  // The teacher can deliberately take a lesson past the standard group size,
  // but the public never sees "7/6" — such a slot is simply full here.
  const shown = Math.min(slot.enrolled, MAX_STUDENTS)

  // Every card has the same four rows, so cards line up across the days.
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full text-right rounded-xl border p-3 transition-all group ${
        disabled
          ? `bg-slate-50 cursor-not-allowed ${mine ? 'border-green-400' : 'border-slate-200 opacity-60'}`
          : `bg-white shadow-sm hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${
              mine ? 'border-green-400' : isEmpty ? 'border-emerald-300' : 'border-slate-200'
            }`
      }`}
    >
      {/* Time and label share a row on phones; the narrow desktop columns stack them. */}
      <div className="flex items-center justify-between gap-2 md:block">
        <div className="text-sm font-bold text-slate-800 tabular-nums whitespace-nowrap" dir="ltr">
          {slot.time}–{slot.endTime}
        </div>

        <div className="md:mt-1.5">
          {isEmpty ? (
            // No label on a free slot, but keep its height so the rows stay aligned.
            <span aria-hidden className="invisible inline-block text-xs px-2 py-0.5 border">&nbsp;</span>
          ) : (
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${GROUP_BADGE[slot.groupType]}`}>
              {GROUP_LABELS[slot.groupType]}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-0.5 mt-2.5" aria-label={`${shown}/${MAX_STUDENTS} תלמידים`}>
        {Array.from({ length: MAX_STUDENTS }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < shown ? 'bg-blue-500' : 'bg-slate-200'}`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 mt-2 text-xs">
        <SlotStatus slot={slot} isPast={isPast} mine={mine} />
        {!disabled && !mine && (
          <span aria-hidden className="text-blue-500 group-hover:text-blue-700 group-hover:-translate-x-0.5 transition-all font-bold">
            ←
          </span>
        )}
      </div>
    </button>
  )
}

function SkeletonCard() {
  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-3 animate-pulse">
      <div className="flex items-center justify-between md:block">
        <div className="h-4 w-20 rounded bg-slate-200/70" />
        <div className="h-5 w-16 rounded-full bg-slate-200/70 md:mt-1.5" />
      </div>
      <div className="h-1.5 rounded-full bg-slate-200/70 mt-2.5" />
      <div className="h-3 w-24 rounded bg-slate-200/70 mt-2" />
    </div>
  )
}

function EmptyDay() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
      אין שיעורים
    </div>
  )
}

const SKELETON_ROWS = 3

// A slot a visitor can still act on: not over, and either empty (request it)
// or with a seat left.
function isBookable(slot: Slot, weekDates: Date[]): boolean {
  if (isSlotPast(slot, weekDates)) return false
  return slot.groupType === 'empty' || slot.enrolled < MAX_STUDENTS
}

export default function ScheduleGrid() {
  const [weekOffset, setWeekOffset] = useState(0)
  // null = a load is in flight (renders skeleton cards instead of a blank grid).
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  // Open on today's tab (Saturday falls back to Friday unless Motzash is active).
  const [activeDay, setActiveDay] = useState<number>(() => Math.min(new Date().getDay(), 5))
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  // On first load, skip ahead past weeks with nothing left to book. Turned off
  // once a week with open slots is found or the visitor navigates themselves.
  const autoAdvance = useRef(true)
  const [autoSkipped, setAutoSkipped] = useState(false)
  const myLessons = useMyLessons()

  const weekKey = getWeekKey(weekOffset)
  const weekDates = getWeekDates(weekOffset)
  const mySlotIds = new Set(
    (myLessons?.lessons ?? []).filter((l) => l.weekKey === weekKey).map((l) => l.slotId),
  )

  // Show the skeleton on week changes too — stale slots under new dates are
  // misleading. Adjusted during render (not in the effect) so the skeleton
  // paints in the same pass that switches weeks. Reloads triggered by
  // 'slotsUpdated' keep the current data visible instead.
  const [loadedWeekKey, setLoadedWeekKey] = useState(weekKey)
  if (loadedWeekKey !== weekKey) {
    setLoadedWeekKey(weekKey)
    setSlots(null)
    setLoadError(false)
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await getSlots(weekKey)
        // Guard against out-of-order responses when flipping weeks quickly.
        if (!cancelled) {
          if (autoAdvance.current) {
            const dates = getWeekDates(weekOffset)
            const open = data.filter((s) => isBookable(s, dates))
            if (open.length === 0 && weekOffset < MAX_WEEK_OFFSET) {
              setAutoSkipped(true)
              setWeekOffset(weekOffset + 1)
              return
            }
            autoAdvance.current = false
            // After a skip, open the mobile view on the first day with room.
            if (weekOffset > 0 && open.length > 0) {
              setActiveDay(Math.min(...open.map((s) => s.day)))
            }
          }
          setSlots(data)
          setLoadError(false)
        }
      } catch {
        if (!cancelled) {
          setSlots([])
          setLoadError(true)
        }
      }
    }
    load()
    window.addEventListener('slotsUpdated', load)
    return () => {
      cancelled = true
      window.removeEventListener('slotsUpdated', load)
    }
  }, [weekKey, weekOffset])

  const loading = slots === null && !loadError
  const slotsByDay = Array.from({ length: 7 }, (_, d) => (slots ?? []).filter((s) => s.day === d))
  const hasMotzash = slotsByDay[MOTZASH_DAY].length > 0
  const visibleDays: DayIndex[] = hasMotzash ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5]

  const goToWeek = (w: number) => {
    autoAdvance.current = false
    setAutoSkipped(false)
    setWeekOffset(w)
  }

  const weekStart = weekDates[0]
  const weekEnd = weekDates[5]
  const weekRange = `${formatShortDate(weekStart)}–${formatShortDate(weekEnd)}`

  return (
    <section id="schedule" className="pt-6 pb-16 px-4 max-w-6xl 2xl:max-w-7xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-slate-900 mb-2">
          לוח השעות השבועי
        </h2>
        <p className="text-slate-500">בחרו יום ושעה שמתאימים לכם ולחצו לבקשת שריון</p>
      </div>

      <MyLessons data={myLessons} />

      {/* Week navigation */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={() => goToWeek(Math.max(0, weekOffset - 1))}
          disabled={weekOffset === 0}
          className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-lg flex items-center justify-center"
        >
          →
        </button>
        <span className="text-sm font-semibold text-slate-700 min-w-[200px] text-center">
          {weekOffset === 0 ? 'שבוע נוכחי' : 'שבוע'} (<span dir="ltr">{weekRange}</span>)
        </span>
        <button
          onClick={() => goToWeek(Math.min(MAX_WEEK_OFFSET, weekOffset + 1))}
          disabled={weekOffset === MAX_WEEK_OFFSET}
          className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-lg flex items-center justify-center"
        >
          ←
        </button>
      </div>

      {autoSkipped && weekOffset > 0 && !loading && (
        <p className="text-center text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg py-2 px-3 mb-6 max-w-md mx-auto">
          {weekOffset === 1
            ? 'אין יותר שיעורים פנויים השבוע, אז עברנו לשבוע הבא'
            : 'אין שיעורים פנויים בשבועות הקרובים, אז עברנו לשבוע הראשון שיש בו מקום'}
        </p>
      )}

      {/* Day tabs — mobile only */}
      <div className={`md:hidden grid ${hasMotzash ? 'grid-cols-7' : 'grid-cols-6'} gap-1.5 mb-6`}>
        {visibleDays.map((i) => (
          <button
            key={i}
            onClick={() => setActiveDay(i)}
            className={`flex flex-col items-center justify-center rounded-lg py-2 px-1 font-bold transition-all ${
              activeDay === i
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <span className="text-xs leading-tight">{dayLabel(i)}</span>
            <span className={`text-[10px] font-normal mt-0.5 ${activeDay === i ? 'text-white/80' : 'text-slate-400'}`}>
              {formatShortDate(weekDates[i])}
            </span>
          </button>
        ))}
      </div>

      {loadError && (
        <p className="text-center text-red-600 py-10 text-sm">שגיאה בטעינת הלוח, נסו לרענן</p>
      )}

      {/* Mobile: single day view */}
      <div className="md:hidden">
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: SKELETON_ROWS }).map((_, i) => <SkeletonCard key={i} />)
          ) : slotsByDay[activeDay].length === 0 && !loadError ? (
            <EmptyDay />
          ) : (
            slotsByDay[activeDay].map((slot) => (
              <SlotCard
                key={slot.id}
                slot={slot}
                isPast={isSlotPast(slot, weekDates)}
                mine={mySlotIds.has(slot.id)}
                onClick={() => setSelectedSlot(slot)}
              />
            ))
          )}
        </div>
      </div>

      {/* Desktop: full week grid */}
      <div className={`hidden md:grid ${hasMotzash ? 'grid-cols-7' : 'grid-cols-6'} gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 backdrop-blur-sm p-4`}>
        {visibleDays.map((d) => (
          <div key={d}>
            <div className="text-center font-bold text-slate-700 mb-3 pb-2 border-b border-slate-200">
              <div>יום {dayLabel(d)}</div>
              <div className="text-xs text-slate-400 font-normal">{formatShortDate(weekDates[d])}</div>
            </div>
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: SKELETON_ROWS }).map((_, i) => <SkeletonCard key={i} />)
              ) : slotsByDay[d].length === 0 && !loadError ? (
                <EmptyDay />
              ) : (
                slotsByDay[d].map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    isPast={isSlotPast(slot, weekDates)}
                    mine={mySlotIds.has(slot.id)}
                    onClick={() => setSelectedSlot(slot)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedSlot && (
        <BookingModal
          slot={selectedSlot}
          weekKey={weekKey}
          weekDates={weekDates}
          onClose={() => setSelectedSlot(null)}
          // The modal dispatches 'slotsUpdated' on success, which reloads the grid.
          onBooked={() => setSelectedSlot(null)}
        />
      )}
    </section>
  )
}
