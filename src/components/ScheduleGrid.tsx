'use client'

import { useState, useEffect } from 'react'
import {
  Slot, DAYS, GROUP_LABELS, MAX_STUDENTS,
  getSlots, getWeekKey, getWeekDates, formatShortDate,
} from '@/lib/types'
import BookingModal from './BookingModal'

const MAX_WEEK_OFFSET = 3

const GROUP_BADGE: Record<string, string> = {
  'middle-school': 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  'high-4': 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  'high-5': 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  'mixed': 'bg-green-500/20 text-green-300 border border-green-500/30',
  'empty': 'bg-zinc-700/20 text-zinc-400 border border-zinc-600/30',
}

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

function SlotCard({ slot, onClick }: { slot: Slot; onClick: () => void }) {
  const isFull = slot.enrolled >= MAX_STUDENTS
  const isEmpty = slot.groupType === 'empty'

  if (isEmpty) {
    return (
      <button
        onClick={onClick}
        className="w-full rounded-xl border border-dashed border-zinc-700/50 p-3 text-center text-zinc-600 text-xs transition-all hover:border-yellow-400/40 hover:bg-zinc-800/40 hover:-translate-y-0.5 cursor-pointer group"
      >
        <div className="font-semibold text-zinc-500">
          {slot.time} – {slot.endTime}
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
      onClick={isFull ? undefined : onClick}
      disabled={isFull}
      className={`w-full text-right rounded-xl border p-3 transition-all group ${
        isFull
          ? 'border-zinc-700/50 bg-zinc-800/30 cursor-not-allowed opacity-60'
          : 'border-zinc-700/50 bg-zinc-800/40 hover:border-yellow-400/50 hover:bg-zinc-800/80 hover:-translate-y-0.5 cursor-pointer'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-slate-400">
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

      <AvailabilityBadge enrolled={slot.enrolled} />

      {!isFull && (
        <div className="mt-2 text-xs text-yellow-400/70 group-hover:text-yellow-400 transition-colors font-semibold">
          לחץ לשריון מקום ←
        </div>
      )}
    </button>
  )
}

export default function ScheduleGrid() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [slots, setSlots] = useState<Slot[]>([])
  const [activeDay, setActiveDay] = useState<number>(0)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)

  const weekKey = getWeekKey(weekOffset)
  const weekDates = getWeekDates(weekOffset)

  const loadSlots = async (key: string) => {
    const data = await getSlots(key)
    setSlots(data)
  }

  useEffect(() => {
    loadSlots(weekKey)
    const handleUpdate = () => loadSlots(weekKey)
    window.addEventListener('slotsUpdated', handleUpdate)
    return () => window.removeEventListener('slotsUpdated', handleUpdate)
  }, [weekKey])

  const slotsByDay = DAYS.map((_, d) => slots.filter((s) => s.day === d))

  const weekStart = weekDates[0]
  const weekEnd = weekDates[4]
  const weekLabel =
    weekOffset === 0
      ? `שבוע נוכחי (${formatShortDate(weekStart)}–${formatShortDate(weekEnd)})`
      : `שבוע ${formatShortDate(weekStart)}–${formatShortDate(weekEnd)}`

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
          {weekLabel}
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

      {/* Mobile: single day view */}
      <div className="md:hidden">
        <div className="space-y-3">
          {slotsByDay[activeDay]?.map((slot) => (
            <SlotCard key={slot.id} slot={slot} onClick={() => setSelectedSlot(slot)} />
          ))}
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
              {slotsByDay[d]?.map((slot) => (
                <SlotCard key={slot.id} slot={slot} onClick={() => setSelectedSlot(slot)} />
              ))}
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
          onBooked={() => {
            setSelectedSlot(null)
            loadSlots(weekKey)
          }}
        />
      )}
    </section>
  )
}
