'use client'

import { Slot, Booking, DAYS, MOTZASH_DAY, DayIndex, dayLabel, GROUP_COLORS, formatShortDate } from '@/lib/types'

const MAX_BARS = 6

// Compact week overview that doubles as the day selector: each column shows
// one colored bar per scheduled (non-empty) slot, so the whole week's shape
// is visible at a glance. The 7th column is Motzash once it has slots —
// until then it's a ghost "+" tile that reveals it.
export default function WeekMiniGrid({ slots, activeDay, onSelectDay, onAddMotzash, mode, weekDates, bookings, weekKey, isCurrentWeek }: {
  slots: Slot[]
  activeDay: number
  onSelectDay: (day: number) => void
  onAddMotzash: () => void
  mode: 'default' | 'week'
  weekDates: Date[]
  bookings: Booking[]
  weekKey: string
  isCurrentWeek: boolean
}) {
  const jsDay = new Date().getDay()
  const hasMotzash = slots.some((s) => s.day === MOTZASH_DAY)

  const renderDayCell = (i: DayIndex) => {
    const daySlots = slots
      .filter((s) => s.day === i && s.groupType !== 'empty')
      .sort((a, b) => a.time.localeCompare(b.time))
    const isActive = activeDay === i
    const isToday = mode === 'week' && isCurrentWeek && jsDay === i

    return (
      <button
        key={i}
        onClick={() => onSelectDay(i)}
        className={`rounded-xl p-2 border transition-all text-center ${
          isActive
            ? 'bg-zinc-800 border-transparent ring-2 ring-yellow-400'
            : 'bg-zinc-800/40 border-zinc-700/40 hover:bg-zinc-800 hover:border-zinc-600'
        }`}
      >
        <div className={`text-xs font-bold flex items-center justify-center gap-1 ${isActive ? 'text-white' : 'text-zinc-400'}`}>
          {dayLabel(i)}
          {isToday && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" aria-label="היום" />}
        </div>
        {mode === 'week' && (
          <div className="text-[10px] text-zinc-500 mt-0.5">{formatShortDate(weekDates[i])}</div>
        )}
        <div className="mt-1.5 space-y-1 min-h-6">
          {daySlots.length === 0 ? (
            <div className="h-1.5 rounded-full border border-dashed border-zinc-700" />
          ) : (
            <>
              {daySlots.slice(0, MAX_BARS).map((s) => {
                const hasStudents = mode === 'week' &&
                  bookings.some((b) => b.slotId === s.id && b.weekKey === weekKey)
                return (
                  <div key={s.id} className="flex items-center gap-0.5">
                    <div className={`h-1.5 flex-1 rounded-full border ${GROUP_COLORS[s.groupType]}`} />
                    {hasStudents && <span className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />}
                  </div>
                )
              })}
              {daySlots.length > MAX_BARS && (
                <div className="text-[10px] text-zinc-500 leading-none">+{daySlots.length - MAX_BARS}</div>
              )}
            </>
          )}
        </div>
      </button>
    )
  }

  return (
    <div className="grid grid-cols-7 gap-1.5 mb-5">
      {DAYS.map((_, i) => renderDayCell(i as DayIndex))}
      {hasMotzash ? (
        renderDayCell(MOTZASH_DAY)
      ) : (
        <button
          onClick={onAddMotzash}
          className="rounded-xl p-2 border border-dashed border-zinc-700 text-zinc-500 hover:border-yellow-400/50 hover:text-yellow-400 transition-all flex flex-col items-center justify-center gap-1"
        >
          <span className="text-xs font-bold">+ מוצ״ש</span>
        </button>
      )}
    </div>
  )
}
