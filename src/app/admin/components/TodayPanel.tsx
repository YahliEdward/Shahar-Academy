'use client'

import { useEffect, useState } from 'react'
import {
  Slot, Booking, DayIndex, dayLabel, GROUP_LABELS, GROUP_BADGE,
  getWeekKey, getWeekDates, formatShortDate, isSlotPast,
} from '@/lib/types'
import { getTodayInfo, whatsappUrl } from '../lib'
import WhatsAppIcon from './WhatsAppIcon'

// "Who's coming today?" — the teacher's most common question, answered without
// digging through the schedule editor. `open === null` means auto: expanded
// when there are lessons today, collapsed on weekends/empty days.
export default function TodayPanel({ slots, bookings, open, onToggle, panelRef }: {
  slots: Slot[]
  bookings: Booking[]
  open: boolean | null
  onToggle: (open: boolean) => void
  panelRef?: React.Ref<HTMLDivElement>
}) {
  const { jsDay, todaySlots, nextSlot } = getTodayInfo(slots)
  const isOpen = open ?? todaySlots.length > 0

  // isSlotPast compares against Date.now() at render; tick every minute while
  // open so the "done / next" markers stay current during a long session.
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!isOpen) return
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [isOpen])

  const weekKey = getWeekKey(0)
  const weekDates = getWeekDates(0)
  const today = new Date()

  return (
    <div ref={panelRef} className="mb-5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => onToggle(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-zinc-800 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-black text-white text-sm">השיעורים של היום</span>
          <span className="text-xs text-zinc-500">
            {`יום ${dayLabel(jsDay as DayIndex)} · ${formatShortDate(today)}`}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {todaySlots.length > 0 && (
            <span className="text-xs rounded-full px-2 py-0.5 bg-yellow-400/15 text-yellow-300 border border-yellow-400/30 font-bold">
              {todaySlots.length}
            </span>
          )}
          <span className={`text-zinc-500 text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-2 border-t border-zinc-700/50 pt-3">
          {todaySlots.length === 0 ? (
            <p className="text-center text-zinc-500 text-sm py-3">
              {jsDay === 6 ? 'אין שיעורים היום (מוצ״ש לא פעיל השבוע)' : 'אין שיעורים מתוכננים להיום'}
            </p>
          ) : (
            todaySlots.map((slot) => {
              const past = isSlotPast(slot, weekDates)
              const isNext = nextSlot?.id === slot.id
              // Bookings without a weekKey (old rows) can't be attributed to a
              // week, so they don't appear here — only in the bookings tab.
              const students = bookings.filter((b) => b.slotId === slot.id && b.weekKey === weekKey)
              const mismatch = students.length !== slot.enrolled

              return (
                <div
                  key={slot.id}
                  className={`rounded-xl border p-3 ${past ? 'opacity-50' : ''} ${
                    isNext ? 'border-yellow-400/50 bg-yellow-400/5 ring-1 ring-yellow-400/30' : 'border-zinc-700/50 bg-zinc-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm" dir="ltr">{slot.time}–{slot.endTime}</span>
                      <span className={`text-xs rounded-full px-2 py-0.5 ${GROUP_BADGE[slot.groupType]}`}>
                        {GROUP_LABELS[slot.groupType]}
                      </span>
                    </div>
                    {past ? (
                      <span className="text-xs text-zinc-500 font-semibold">הסתיים</span>
                    ) : isNext ? (
                      <span className="text-xs rounded-full px-2 py-0.5 bg-yellow-400 text-black font-black">הבא</span>
                    ) : null}
                  </div>

                  {students.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {students.map((b) => (
                        <div key={b.id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${b.status === 'confirmed' ? 'bg-green-400' : 'bg-zinc-500'}`}
                              title={b.status === 'confirmed' ? 'מאושר' : 'ממתין לאישור'}
                            />
                            <span className="text-sm text-zinc-200 truncate">{b.studentName}</span>
                            <span className="text-xs text-zinc-500 flex-shrink-0">{b.grade}</span>
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <a
                              href={`tel:${b.phone}`}
                              aria-label={`התקשרו אל ${b.studentName}`}
                              className="w-9 h-9 rounded-lg bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-sm transition-colors"
                            >
                              📞
                            </a>
                            <a
                              href={whatsappUrl(b.phone, b.studentName)}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`וואטסאפ אל ${b.studentName}`}
                              className="w-9 h-9 rounded-lg bg-green-700 hover:bg-green-600 flex items-center justify-center transition-colors"
                            >
                              <WhatsAppIcon className="w-4 h-4 text-white" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* `enrolled` is the manually-managed capacity counter — bookings
                      are just the contact list, so surface both without syncing. */}
                  {mismatch && (
                    <p className="text-[11px] text-zinc-500 mt-2">{slot.enrolled} רשומים בלוח</p>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
