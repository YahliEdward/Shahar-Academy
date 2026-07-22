'use client'

import { useState } from 'react'
import { Booking, Slot } from '@/lib/types'
import { getSlotLabel, normalizePhone } from '../lib'
import BookingCard from './BookingCard'

export type BookingsFilter = 'all' | 'pending' | 'confirmed'

export default function BookingsTab({ bookings, slots, filter, onFilterChange, onRefresh }: {
  bookings: Booking[]
  slots: Slot[]
  filter: BookingsFilter
  onFilterChange: (f: BookingsFilter) => void
  onRefresh: () => void
}) {
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const qDigits = normalizePhone(q)
  const matches = (b: Booking) => {
    if (!q) return true
    if (b.studentName.toLowerCase().includes(q) || b.parentName.toLowerCase().includes(q)) return true
    return qDigits.length > 0 && normalizePhone(b.phone).includes(qDigits)
  }

  const filtered = bookings.filter(matches)
  // Pending oldest-first (act on the oldest request first); confirmed newest-first.
  const pending = filtered
    .filter((b) => b.status === 'pending')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const confirmed = filtered
    .filter((b) => b.status === 'confirmed')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const pendingCount = bookings.filter((b) => b.status === 'pending').length
  const confirmedCount = bookings.length - pendingCount

  const chips: { key: BookingsFilter; label: string }[] = [
    { key: 'all', label: 'הכל' },
    { key: 'pending', label: `ממתין (${pendingCount})` },
    { key: 'confirmed', label: `מאושר (${confirmedCount})` },
  ]

  if (bookings.length === 0) {
    return <p className="text-center text-slate-400 py-10">אין בקשות רישום עדיין</p>
  }

  const renderCards = (list: Booking[]) => list.map((b) => (
    <BookingCard key={b.id} booking={b} slotLabel={getSlotLabel(b, slots)} onRefresh={onRefresh} />
  ))

  const visible = filter === 'pending' ? pending : filter === 'confirmed' ? confirmed : null

  return (
    <div>
      {/* Search + filter controls */}
      <div className="mb-4 space-y-3">
        <input
          type="text"
          inputMode="search"
          placeholder="חיפוש לפי שם או טלפון…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors placeholder:text-slate-400"
        />
        <div className="flex gap-2">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => onFilterChange(c.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                filter === c.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-slate-400 py-10 text-sm">אין תוצאות ל&quot;{query}&quot;</p>
      ) : visible ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{renderCards(visible)}</div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-blue-600 mb-3 uppercase tracking-wider">
                ממתין לאישור ({pending.length})
              </h3>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{renderCards(pending)}</div>
            </div>
          )}
          {confirmed.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-green-600 mb-3 uppercase tracking-wider">
                מאושר ({confirmed.length})
              </h3>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{renderCards(confirmed)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
