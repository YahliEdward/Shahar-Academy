'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Slot, Booking, getWeekKey } from '@/lib/types'
import { adminLogout, adminSession, fetchBookings, fetchWeekSlots } from '@/lib/adminApi'
import PushToggle from '@/components/PushToggle'
import { ToastProvider } from './components/ui/Toast'
import { ConfirmProvider } from './components/ui/ConfirmDialog'
import LoginScreen from './components/LoginScreen'
import AdminHeader from './components/AdminHeader'
import DashboardStats from './components/DashboardStats'
import TodayPanel from './components/TodayPanel'
import BookingsTab, { BookingsFilter } from './components/BookingsTab'
import ScheduleTab from './components/ScheduleTab'

type Tab = 'bookings' | 'schedule'

export default function AdminPage() {
  // null = still checking whether a previous session cookie is valid.
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('bookings')
  const [slots, setSlots] = useState<Slot[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingsFilter, setBookingsFilter] = useState<BookingsFilter>('all')
  // null = auto (TodayPanel opens itself when there are lessons today).
  const [todayOpen, setTodayOpen] = useState<boolean | null>(null)
  // Bumped when the occupancy stat is clicked so ScheduleTab remounts in week mode.
  const [scheduleKey, setScheduleKey] = useState(0)
  const [scheduleMode, setScheduleMode] = useState<'default' | 'week'>('default')
  const todayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    adminSession().then(setAuthed)
  }, [])

  useEffect(() => {
    if (!authed) return
    fetchWeekSlots(getWeekKey(0)).then((r) => setSlots(r.slots)).catch(() => {})
    fetchBookings().then(setBookings).catch(() => {})
  }, [authed])

  useEffect(() => {
    if (!authed) return
    const handler = () => fetchBookings().then(setBookings).catch(() => {})
    window.addEventListener('slotsUpdated', handler)
    return () => window.removeEventListener('slotsUpdated', handler)
  }, [authed])

  const handleScheduleChanged = useCallback(() => {
    fetchWeekSlots(getWeekKey(0)).then((r) => setSlots(r.slots)).catch(() => {})
    window.dispatchEvent(new Event('slotsUpdated'))
  }, [])

  const refreshBookings = () => {
    fetchBookings().then(setBookings).catch(() => {})
    // Confirming/removing a booking can change slot occupancy too.
    fetchWeekSlots(getWeekKey(0)).then((r) => setSlots(r.slots)).catch(() => {})
  }

  const handleLogout = async () => {
    await adminLogout()
    setAuthed(false)
  }

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center math-bg">
        <p className="text-slate-400 text-sm">טוען…</p>
      </div>
    )
  }
  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />

  const pendingCount = bookings.filter((b) => b.status === 'pending').length

  const goToPending = () => {
    setTab('bookings')
    setBookingsFilter('pending')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToToday = () => {
    setTodayOpen(true)
    todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const goToSchedule = () => {
    setTab('schedule')
    setScheduleMode('week')
    setScheduleKey((k) => k + 1)
  }

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="min-h-screen math-bg">
          <AdminHeader onLogout={handleLogout} />

          <div className="max-w-4xl mx-auto px-4 py-6">
            <PushToggle />

            <DashboardStats
              bookings={bookings}
              slots={slots}
              onPendingClick={goToPending}
              onTodayClick={goToToday}
              onOccupancyClick={goToSchedule}
            />

            <TodayPanel
              slots={slots}
              bookings={bookings}
              open={todayOpen}
              onToggle={setTodayOpen}
              panelRef={todayRef}
            />

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setTab('bookings')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  tab === 'bookings' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                בקשות רישום
                {pendingCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-black">
                    {pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setTab('schedule')}
                className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  tab === 'schedule' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                ניהול לוח שעות
              </button>
            </div>

            {tab === 'bookings' && (
              <BookingsTab
                bookings={bookings}
                slots={slots}
                filter={bookingsFilter}
                onFilterChange={setBookingsFilter}
                onRefresh={refreshBookings}
              />
            )}
            {tab === 'schedule' && (
              <ScheduleTab
                key={scheduleKey}
                bookings={bookings}
                onChanged={handleScheduleChanged}
                defaultMode={scheduleMode}
              />
            )}
          </div>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  )
}
