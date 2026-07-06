'use client'

import { Booking, Slot, MAX_STUDENTS } from '@/lib/types'
import { getTodayInfo } from '../lib'

function StatCard({ value, label, sub, accent, onClick, children }: {
  value: string
  label: string
  sub?: string
  accent?: boolean
  onClick: () => void
  children?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3 text-center transition-all hover:border-yellow-400/40 hover:bg-zinc-800 active:scale-[0.98]"
    >
      <div className={`text-2xl font-black ${accent ? 'text-yellow-400' : 'text-white'}`} dir="ltr">
        {value}
      </div>
      <div className="text-[11px] text-zinc-400 font-semibold mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-zinc-500 mt-0.5" dir="ltr">{sub}</div>}
      {children}
    </button>
  )
}

// At-a-glance numbers derived from the already-loaded bookings + current-week
// slots; each card jumps to the matching view.
export default function DashboardStats({ bookings, slots, onPendingClick, onTodayClick, onOccupancyClick }: {
  bookings: Booking[]
  slots: Slot[]
  onPendingClick: () => void
  onTodayClick: () => void
  onOccupancyClick: () => void
}) {
  const pendingCount = bookings.filter((b) => b.status === 'pending').length
  const { jsDay, todaySlots, nextSlot } = getTodayInfo(slots)

  const activeSlots = slots.filter((s) => s.groupType !== 'empty')
  const capacity = activeSlots.length * MAX_STUDENTS
  const enrolled = activeSlots.reduce((sum, s) => sum + s.enrolled, 0)

  const todaySub = nextSlot
    ? `הבא: ${nextSlot.time}`
    : todaySlots.length > 0
      ? 'הסתיימו להיום'
      : jsDay === 6
        ? 'סוף שבוע'
        : 'יום פנוי'

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
      <StatCard
        value={String(pendingCount)}
        label="ממתינות לאישור"
        sub={pendingCount > 0 ? 'לחצו לטיפול' : 'הכל מטופל'}
        accent={pendingCount > 0}
        onClick={onPendingClick}
      />
      <StatCard
        value={String(todaySlots.length)}
        label="שיעורים היום"
        sub={todaySub}
        onClick={onTodayClick}
      />
      <StatCard
        value={capacity === 0 ? '—' : `${enrolled}/${capacity}`}
        label="תפוסה השבוע"
        onClick={onOccupancyClick}
      >
        <div className="mt-1.5 h-1 rounded-full bg-zinc-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-yellow-400 transition-all"
            style={{ width: capacity === 0 ? '0%' : `${Math.round((enrolled / capacity) * 100)}%` }}
          />
        </div>
      </StatCard>
    </div>
  )
}
