'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Slot, dayLabel, GROUP_LABELS, MAX_STUDENTS, isClosedToPublic,
  getSlots, getWeekKey, getWeekDates, isSlotPast,
} from '@/lib/types'
import BookingModal from './BookingModal'

const MAX_SHOWN = 3

interface OpenSlot {
  slot: Slot
  weekKey: string
  weekDates: Date[]
  start: Date
}

function slotStart(slot: Slot, weekDates: Date[]): Date {
  const [h, m] = slot.time.split(':').map(Number)
  const start = new Date(weekDates[slot.day])
  start.setHours(h || 0, m || 0, 0, 0)
  return start
}

// The nearest hours a visitor can book: real groups with a seat left first,
// topped up with not-yet-assigned hours only when there aren't enough.
async function loadOpenSlots(): Promise<OpenSlot[]> {
  const weeks = await Promise.all(
    [0, 1].map(async (offset) => {
      const weekKey = getWeekKey(offset)
      const weekDates = getWeekDates(offset)
      const slots = await getSlots(weekKey).catch((): Slot[] => [])
      return slots
        .filter((slot) => weekDates[slot.day] && !isSlotPast(slot, weekDates))
        .map((slot) => ({ slot, weekKey, weekDates, start: slotStart(slot, weekDates) }))
    }),
  )
  const upcoming = weeks.flat().sort((a, b) => a.start.getTime() - b.start.getTime())
  const groups = upcoming.filter((o) => o.slot.groupType !== 'empty' && !isClosedToPublic(o.slot) && o.slot.enrolled < MAX_STUDENTS)
  const unassigned = upcoming.filter((o) => o.slot.groupType === 'empty')
  return [...groups, ...unassigned]
    .slice(0, MAX_SHOWN)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
}

// "היום" / "מחר" read faster than a weekday name that could mean next week.
function whenLabel(o: OpenSlot): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const day = new Date(o.start)
  day.setHours(0, 0, 0, 0)
  const diff = Math.round((day.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'היום'
  if (diff === 1) return 'מחר'
  return `יום ${dayLabel(o.slot.day)}`
}

function detailLabel(slot: Slot): string {
  if (slot.groupType === 'empty') return 'פנוי לגמרי'
  const free = MAX_STUDENTS - slot.enrolled
  const seats = free === 1 ? 'נשאר מקום אחד' : `${free} מקומות פנויים`
  return `${GROUP_LABELS[slot.groupType]} · ${seats}`
}

export default function NextOpenSlots() {
  // null = still loading.
  const [open, setOpen] = useState<OpenSlot[] | null>(null)
  const [selected, setSelected] = useState<OpenSlot | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () => {
      loadOpenSlots()
        .then((data) => { if (!cancelled) setOpen(data) })
        .catch(() => { if (!cancelled) setOpen([]) })
    }
    load()
    // BookingModal fires this after a successful booking.
    window.addEventListener('slotsUpdated', load)
    return () => {
      cancelled = true
      window.removeEventListener('slotsUpdated', load)
    }
  }, [])

  // Nothing to offer (or the load failed): the hero button still leads to the schedule.
  if (open && open.length === 0) return null

  return (
    <section id="next-slots" className="px-4 pb-14 max-w-md mx-auto">
      <h2 className="text-xl font-black text-slate-900 mb-4 text-center">
        שעות פנויות קרובות
      </h2>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100 overflow-hidden">
        {open === null
          ? Array.from({ length: MAX_SHOWN }).map((_, i) => (
              <div key={i} className="h-[62px] px-4 py-3 animate-pulse">
                <div className="h-4 w-28 rounded bg-slate-200/70" />
                <div className="h-3 w-36 rounded bg-slate-200/70 mt-2" />
              </div>
            ))
          : open.map((o) => (
              <button
                key={`${o.weekKey}|${o.slot.id}`}
                onClick={() => setSelected(o)}
                className="group w-full flex items-center justify-between gap-3 px-4 py-3 text-right hover:bg-blue-50/60 transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-bold text-slate-800">
                    {whenLabel(o)} <span className="tabular-nums">{o.slot.time}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{detailLabel(o.slot)}</div>
                </div>
                <span aria-hidden className="text-blue-600 font-bold group-hover:-translate-x-0.5 transition-transform">
                  ←
                </span>
              </button>
            ))}
      </div>

      <div className="text-center mt-3">
        <Link href="/schedule" className="text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors">
          לכל השעות בלוח
        </Link>
      </div>

      {selected && (
        <BookingModal
          slot={selected.slot}
          weekKey={selected.weekKey}
          weekDates={selected.weekDates}
          onClose={() => setSelected(null)}
          // The modal dispatches 'slotsUpdated' on success, which reloads the list.
          onBooked={() => setSelected(null)}
        />
      )}
    </section>
  )
}
