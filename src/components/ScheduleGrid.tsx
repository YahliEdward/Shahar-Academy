'use client'

import { useState, useEffect } from 'react'
import {
  Slot, DayIndex, MOTZASH_DAY, dayLabel, GROUP_LABELS, GROUP_BADGE, MAX_STUDENTS,
  getSlots, getWeekKey, getWeekDates, formatShortDate, isSlotPast,
} from '@/lib/types'
import BookingModal from './BookingModal'

const MAX_WEEK_OFFSET = 3

function AvailabilityBadge({ enrolled }: { enrolled: number }) {
  const free = MAX_STUDENTS - enrolled
  if (enrolled >= MAX_STUDENTS) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 font-semibold border border-slate-200">
        מלא לחלוטין
      </span>
    )
  }
  if (free === 1) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-300 pulse-badge">
        רק מקום 1 פנוי!
      </span>
    )
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-semibold border border-green-200">
      {free} מקומות פנויים
    </span>
  )
}

function SlotCard({ slot, isPast, onClick }: { slot: Slot; isPast: boolean; onClick: () => void }) {
  const isFull = slot.enrolled >= MAX_STUDENTS
  const isEmpty = slot.groupType === 'empty'
  const disabled = isFull || isPast

  if (isEmpty) {
    if (isPast) {
      return (
        <div className="w-full rounded-xl border border-dashed border-slate-200 p-3 text-center text-slate-300 text-xs opacity-70">
          <div className="font-semibold" dir="ltr">
            {slot.time}–{slot.endTime}
          </div>
          <div className="mt-1">הסתיים</div>
        </div>
      )
    }
    return (
      <button
        onClick={onClick}
        className="w-full rounded-xl border border-dashed border-slate-300 p-3 text-center text-slate-400 text-xs transition-all hover:border-blue-400 hover:bg-blue-50/50 hover:-translate-y-0.5 cursor-pointer group"
      >
        <div className="font-semibold text-slate-500" dir="ltr">
          {slot.time}–{slot.endTime}
        </div>
        <div className="mt-1">פנוי</div>
        <div className="mt-1.5 text-blue-600/0 group-hover:text-blue-600/80 transition-colors font-semibold">
          לחץ לבקשת שריון ←
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full text-right rounded-xl border p-3 transition-all group ${
        disabled
          ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60'
          : 'border-slate-200 bg-white shadow-sm hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-slate-500" dir="ltr">
          {slot.time}–{slot.endTime}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${GROUP_BADGE[slot.groupType]}`}>
          {GROUP_LABELS[slot.groupType]}
        </span>
      </div>

      <div className="mb-2">
        <div className="flex gap-0.5">
          {Array.from({ length: MAX_STUDENTS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i < slot.enrolled ? 'bg-blue-500' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {slot.enrolled}/{MAX_STUDENTS} תלמידים
        </div>
      </div>

      {isPast ? (
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 font-semibold border border-slate-200">
          הסתיים
        </span>
      ) : (
        <AvailabilityBadge enrolled={slot.enrolled} />
      )}

      {!disabled && (
        <div className="mt-2 text-xs text-blue-600/70 group-hover:text-blue-600 transition-colors font-semibold">
          לחץ לבקשת שריון ←
        </div>
      )}
    </button>
  )
}

function SkeletonCard() {
  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-3 animate-pulse">
      <div className="flex items-center justify-between mb-2">
        <div className="h-3 w-16 rounded bg-slate-200/70" />
        <div className="h-4 w-14 rounded-full bg-slate-200/70" />
      </div>
      <div className="h-1.5 rounded-full bg-slate-200/70 mb-2" />
      <div className="h-3 w-20 rounded bg-slate-200/70 mb-2" />
      <div className="h-5 w-24 rounded-full bg-slate-200/70" />
    </div>
  )
}

function EmptyDay() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
      אין שיעורים ביום זה
    </div>
  )
}

const SKELETON_ROWS = 3

export default function ScheduleGrid() {
  const [weekOffset, setWeekOffset] = useState(0)
  // null = a load is in flight (renders skeleton cards instead of a blank grid).
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  // Open on today's tab (Saturday falls back to Friday unless Motzash is active).
  const [activeDay, setActiveDay] = useState<number>(() => Math.min(new Date().getDay(), 5))
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)

  const weekKey = getWeekKey(weekOffset)
  const weekDates = getWeekDates(weekOffset)

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
  }, [weekKey])

  const loading = slots === null && !loadError
  const slotsByDay = Array.from({ length: 7 }, (_, d) => (slots ?? []).filter((s) => s.day === d))
  const hasMotzash = slotsByDay[MOTZASH_DAY].length > 0
  const visibleDays: DayIndex[] = hasMotzash ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5]

  const weekStart = weekDates[0]
  const weekEnd = weekDates[5]
  const weekRange = `${formatShortDate(weekStart)}–${formatShortDate(weekEnd)}`

  return (
    <section id="schedule" className="pt-6 pb-16 px-4 max-w-6xl xl:max-w-7xl 2xl:max-w-[1600px] mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-slate-900 mb-2">
          לוח השעות השבועי
        </h2>
        <p className="text-slate-500">בחרו יום ושעה שמתאימים לכם — לחצו לבקשת שריון</p>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
          disabled={weekOffset === 0}
          className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-lg flex items-center justify-center"
        >
          →
        </button>
        <span className="text-sm font-semibold text-slate-700 min-w-[200px] text-center">
          {weekOffset === 0 ? 'שבוע נוכחי' : 'שבוע'} (<span dir="ltr">{weekRange}</span>)
        </span>
        <button
          onClick={() => setWeekOffset((w) => Math.min(MAX_WEEK_OFFSET, w + 1))}
          disabled={weekOffset === MAX_WEEK_OFFSET}
          className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-lg flex items-center justify-center"
        >
          ←
        </button>
      </div>

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
        <p className="text-center text-red-600 py-10 text-sm">שגיאה בטעינת הלוח — נסו לרענן</p>
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
                onClick={() => setSelectedSlot(slot)}
              />
            ))
          )}
        </div>
      </div>

      {/* Desktop: full week grid */}
      <div className={`hidden md:grid ${hasMotzash ? 'grid-cols-7' : 'grid-cols-6'} gap-4`}>
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
