'use client'

import { useState, useEffect } from 'react'
import { dayLabel, formatShortDate } from '@/lib/types'
import { getMyLessons, type MyLesson } from '@/lib/adminApi'
import { readMyBookingIds, keepOnlyMyBookingIds } from '@/lib/myBookings'
import { buildLessonIcs, downloadIcs } from '@/lib/ics'
import type { LessonLocation } from '@/lib/lessonLocation'

export interface UpcomingLesson extends MyLesson {
  date: Date
}

export interface MyLessonsData {
  lessons: UpcomingLesson[]
  location: LessonLocation | null
}

function atTime(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(date)
  d.setHours(h || 0, m || 0, 0, 0)
  return d
}

// weekKey is the week's Sunday (YYYY-MM-DD); day counts from it.
function lessonDate(lesson: MyLesson): Date {
  const [y, m, d] = lesson.weekKey.split('-').map(Number)
  return new Date(y, m - 1, d + lesson.day)
}

// Upcoming lessons booked from this browser, re-read whenever the grid
// reloads ('slotsUpdated' — also fired right after a booking). null until
// there is something to show.
export function useMyLessons(): MyLessonsData | null {
  const [data, setData] = useState<MyLessonsData | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const ids = readMyBookingIds()
      if (ids.length === 0) return
      try {
        const { lessons, location } = await getMyLessons(ids)
        const now = Date.now()
        const upcoming = lessons
          .map((l) => ({ ...l, date: lessonDate(l) }))
          .filter((l) => atTime(l.date, l.endTime).getTime() > now)
          .sort((a, b) => atTime(a.date, a.time).getTime() - atTime(b.date, b.time).getTime())
        // Forget lessons that were cancelled or are over, so the list stays short.
        keepOnlyMyBookingIds(new Set(upcoming.map((l) => l.id)))
        if (!cancelled) setData({ lessons: upcoming, location })
      } catch {
        // Nice-to-have: on failure just don't show the card.
      }
    }
    load()
    window.addEventListener('slotsUpdated', load)
    return () => {
      cancelled = true
      window.removeEventListener('slotsUpdated', load)
    }
  }, [])

  return data
}

// className sets where the card sits (width/margins) on each page.
export default function MyLessons({
  data,
  className = 'max-w-xl mx-auto mb-8',
}: {
  data: MyLessonsData | null
  className?: string
}) {
  if (!data || data.lessons.length === 0) return null
  const { lessons, location } = data

  return (
    <div className={`${className} rounded-2xl border border-green-200 bg-green-50/60 p-4 sm:p-5 text-right`}>
      <h3 className="font-black text-slate-900 mb-3">
        {lessons.length === 1 ? 'השיעור הקרוב שלך' : 'השיעורים הקרובים שלך'}
      </h3>

      <ul className="space-y-2">
        {lessons.map((l) => (
          <li
            key={l.id}
            className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 px-3 py-2.5"
          >
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-sm">
                יום {dayLabel(l.day)} {formatShortDate(l.date)}
              </div>
              <div className="text-xs text-slate-500 truncate">
                <span dir="ltr" className="font-semibold text-slate-700">{l.time}–{l.endTime}</span> · {l.studentName}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {l.status === 'confirmed' ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-semibold border border-green-200">
                  מאושר ✓
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                  ממתין לאישור
                </span>
              )}
              <button
                onClick={() => downloadIcs('shahar-lesson.ics', buildLessonIcs({
                  date: l.date,
                  time: l.time,
                  endTime: l.endTime,
                  studentName: l.studentName,
                  location: location?.address,
                }))}
                aria-label="הוספה ליומן"
                title="הוספה ליומן"
                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-sm transition-colors"
              >
                📅
              </button>
            </div>
          </li>
        ))}
      </ul>

      {location && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-slate-600">
            📍 <span className="font-semibold text-slate-900">{location.address}</span>
          </span>
          <span className="flex gap-2">
            <a
              href={location.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg transition-colors text-xs"
            >
              Google Maps
            </a>
            <a
              href={location.wazeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg transition-colors text-xs"
            >
              Waze
            </a>
          </span>
        </div>
      )}
    </div>
  )
}
