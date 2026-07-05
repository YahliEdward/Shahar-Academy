'use client'

import { useState, useEffect } from 'react'
import {
  Slot, DAYS, GROUP_LABELS, GROUP_BADGE, MAX_STUDENTS,
  getSlots, getWeekKey, getWeekDates, formatShortDate, isSlotPast,
} from '@/lib/types'
import BookingModal from './BookingModal'

const MAX_WEEK_OFFSET = 3

function AvailabilityBadge({ enrolled }: { enrolled: number }) {
  const free = MAX_STUDENTS - enrolled
  if (enrolled >= MAX_STUDENTS) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 font-semibold border border-zinc-700">
        מלא לחלוטין
      </span>
    )
  }
  if (free === 1) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 font-bold border border-yellow-400/40 pulse-gold">
        רק מקום 1 פנוי!
      </span>
    )
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 font-semibold border border-green-500/30">
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
        <div className="w-full rounded-xl border border-dashed border-zinc-800/60 p-3 text-center text-zinc-700 text-xs opacity-50">
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
        className="w-full rounded-xl border border-dashed border-zinc-700/50 p-3 text-center text-zinc-600 text-xs transition-all hover:border-yellow-400/40 hover:bg-zinc-800/40 hover:-translate-y-0.5 cursor-pointer group"
      >
        <div className="font-semibold text-zinc-500" dir="ltr">
          {slot.time}–{slot.endTime}
        </div>
        <div className="mt-1">פנוי</div>
        <div className="mt-1.5 text-yellow-400/0 group-hover:text-yellow-400/70 transition-colors font-semibold">
          לחץ לשריון מקום ←
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
          ? 'border-zinc-700/50 bg-zinc-800/30 cursor-not-allowed opacity-60'
          : 'border-zinc-700/50 bg-zinc-800/40 hover:border-yellow-400/50 hover:bg-zinc-800/80 hover:-translate-y-0.5 cursor-pointer'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-slate-400" dir="ltr">
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
                i < slot.enrolled ? 'bg-yellow-400' : 'bg-zinc-700'
              }`}
            />
          ))}
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          {slot.enrolled}/{MAX_STUDENTS} תלמידים
        </div>
      </div>

      {isPast ? (
        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 font-semibold border border-zinc-700">
          הסתיים
        </span>
      ) : (
        <AvailabilityBadge enrolled={slot.enrolled} />
      )}

      {!disabled && (
        <div className="mt-2 text-xs text-yellow-400/70 group-hover:text-yellow-400 transition-colors font-semibold">
          לחץ לשריון מקום ←
        </div>
      )}
    </button>
  )
}

function SkeletonCard() {
  return (
    <div className="w-full rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-3 animate-pulse">
      <div className="flex items-center justify-between mb-2">
        <div className="h-3 w-16 rounded bg-zinc-700/70" />
        <div className="h-4 w-14 rounded-full bg-zinc-700/70" />
      </div>
      <div className="h-1.5 rounded-full bg-zinc-700/70 mb-2" />
      <div className="h-3 w-20 rounded bg-zinc-700/70 mb-2" />
      <div className="h-5 w-24 rounded-full bg-zinc-700/70" />
    </div>
  )
}

function EmptyDay() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-600">
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
  // Open on today's tab (Friday/Saturday fall back to Thursday).
  const [activeDay, setActiveDay] = useState<number>(() => Math.min(new Date().getDay(), 4))
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)

  const weekKey = getWeekKey(weekOffset)
  const weekDates = getWeekDates(weekOffset)

  useEffect(() => {
    let cancelled = false
    // Show the skeleton on week changes too — stale slots under new dates are misleading.
    // Reloads triggered by 'slotsUpdated' keep the current data visible instead.
    setSlots(null)
    setLoadError(false)
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
  const slotsByDay = DAYS.map((_, d) => (slots ?? []).filter((s) => s.day === d))

  const weekStart = weekDates[0]
  const weekEnd = weekDates[4]
  const weekRange = `${formatShortDate(weekStart)}–${formatShortDate(weekEnd)}`

  return (
    <section id="schedule" className="pt-6 pb-16 px-4 max-w-6xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-white mb-2">
          לוח השעות השבועי
        </h2>
        <p className="text-slate-400">בחרו יום ושעה שמתאימים לכם — לחצו לשריון מקום</p>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
          disabled={weekOffset === 0}
          className="w-9 h-9 rounded-lg bg-zinc-800 text-slate-400 hover:bg-zinc-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-lg flex items-center justify-center"
        >
          →
        </button>
        <span className="text-sm font-semibold text-slate-300 min-w-[200px] text-center">
          {weekOffset === 0 ? 'שבוע נוכחי' : 'שבוע'} (<span dir="ltr">{weekRange}</span>)
        </span>
        <button
          onClick={() => setWeekOffset((w) => Math.min(MAX_WEEK_OFFSET, w + 1))}
          disabled={weekOffset === MAX_WEEK_OFFSET}
          className="w-9 h-9 rounded-lg bg-zinc-800 text-slate-400 hover:bg-zinc-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-lg flex items-center justify-center"
        >
          ←
        </button>
      </div>

      {/* Day tabs — mobile only */}
      <div className="md:hidden grid grid-cols-5 gap-1.5 mb-6">
        {DAYS.map((day, i) => (
          <button
            key={day}
            onClick={() => setActiveDay(i)}
            className={`flex flex-col items-center justify-center rounded-lg py-2 px-1 font-bold transition-all ${
              activeDay === i
                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                : 'bg-zinc-800 text-slate-400 hover:bg-zinc-700 hover:text-white'
            }`}
          >
            <span className="text-xs leading-tight">{day}</span>
            <span className={`text-[10px] font-normal mt-0.5 ${activeDay === i ? 'text-black/70' : 'text-slate-500'}`}>
              {formatShortDate(weekDates[i])}
            </span>
          </button>
        ))}
      </div>

      {loadError && (
        <p className="text-center text-red-400 py-10 text-sm">שגיאה בטעינת הלוח — נסו לרענן</p>
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
      <div className="hidden md:grid grid-cols-5 gap-4">
        {DAYS.map((day, d) => (
          <div key={day}>
            <div className="text-center font-bold text-slate-300 mb-3 pb-2 border-b border-zinc-700/50">
              <div>יום {day}</div>
              <div className="text-xs text-slate-500 font-normal">{formatShortDate(weekDates[d])}</div>
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
