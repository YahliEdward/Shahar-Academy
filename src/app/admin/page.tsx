'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Slot, Booking, Testimonial, getWeekKey } from '@/lib/types'
import { adminLogout, adminSession, fetchBookings, fetchWeekSlots, fetchTestimonials } from '@/lib/adminApi'
import PushToggle from '@/components/PushToggle'
import { ToastProvider } from './components/ui/Toast'
import { ConfirmProvider } from './components/ui/ConfirmDialog'
import LoginScreen from './components/LoginScreen'
import AdminHeader from './components/AdminHeader'
import DashboardStats from './components/DashboardStats'
import TodayPanel from './components/TodayPanel'
import BookingsTab, { BookingsFilter } from './components/BookingsTab'
import StudentsTab, { StudentsFilter } from './components/StudentsTab'
import ScheduleTab from './components/ScheduleTab'
import ReportsTab from './components/ReportsTab'
import TestimonialsTab from './components/TestimonialsTab'

type Tab = 'bookings' | 'students' | 'schedule' | 'reports' | 'testimonials'

export default function AdminPage() {
  // null = still checking whether a previous session cookie is valid.
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('bookings')
  const [slots, setSlots] = useState<Slot[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [bookingsFilter, setBookingsFilter] = useState<BookingsFilter>('all')
  const [studentsFilter, setStudentsFilter] = useState<StudentsFilter>('all')
  // null = auto (TodayPanel opens itself when there are lessons today).
  const [todayOpen, setTodayOpen] = useState<boolean | null>(null)
  // Bumped when the occupancy stat is clicked so ScheduleTab remounts in week mode.
  const [scheduleKey, setScheduleKey] = useState(0)
  const [scheduleMode, setScheduleMode] = useState<'default' | 'week'>('week')
  const todayRef = useRef<HTMLDivElement>(null)
  // Until the first load succeeds the dashboard must not render: empty lists
  // would read as "no bookings" / "all handled" when the network is down.
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    adminSession().then(setAuthed)
  }, [])

  // Loads everything the dashboard shows. A background refresh keeps the data
  // already on screen if it fails; only the first load surfaces an error.
  const loadAll = useCallback((background = false) =>
    Promise.all([fetchWeekSlots(getWeekKey(0)), fetchBookings(), fetchTestimonials()])
      .then(([week, bookingList, testimonialList]) => {
        setSlots(week.slots)
        setBookings(bookingList)
        setTestimonials(testimonialList)
        setLoadState('ready')
      })
      .catch(() => {
        if (!background) setLoadState('error')
      }), [])

  useEffect(() => {
    if (!authed) return
    loadAll()
  }, [authed, loadAll])

  // A booking can arrive (with a push notification) while the dashboard sits
  // open in a background tab — pull fresh data whenever it comes back into view.
  useEffect(() => {
    if (!authed) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadAll(true)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [authed, loadAll])

  const retryLoad = () => {
    setLoadState('loading')
    loadAll()
  }

  const refreshTestimonials = () => {
    fetchTestimonials().then(setTestimonials).catch(() => {})
  }

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
  const pendingTestimonialsCount = testimonials.filter((t) => t.status === 'pending').length

  const goToPending = () => {
    setTab('bookings')
    setBookingsFilter('pending')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToToday = () => {
    setTodayOpen(true)
    todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const goToOwed = () => {
    setTab('students')
    setStudentsFilter('owed')
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

          <div className="max-w-4xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-4 lg:px-6 py-6">
            <PushToggle />

            {loadState === 'loading' ? (
              <p className="text-center text-slate-400 py-10 text-sm">טוען…</p>
            ) : loadState === 'error' ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
                <p className="font-bold text-red-700">לא הצלחנו לטעון את הנתונים</p>
                <p className="text-xs text-red-600 mt-1">בדקו את החיבור לאינטרנט ונסו שוב.</p>
                <button
                  onClick={retryLoad}
                  className="mt-3 min-h-10 px-5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-sm transition-colors"
                >
                  נסו שוב
                </button>
              </div>
            ) : (
              <>
                <DashboardStats
                  bookings={bookings}
                  slots={slots}
                  onPendingClick={goToPending}
                  onTodayClick={goToToday}
                  onOccupancyClick={goToSchedule}
                onIncomeClick={goToOwed}
                />

                <TodayPanel
                  slots={slots}
                  bookings={bookings}
                  open={todayOpen}
                  onToggle={setTodayOpen}
                  panelRef={todayRef}
                />

                {/* Tabs — scroll sideways on narrow phones instead of squeezing */}
                <div className="flex gap-2 mb-6 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 pb-1">
                  {([
                    { key: 'bookings', label: 'בקשות רישום', badge: pendingCount },
                    { key: 'students', label: 'תלמידים', badge: 0 },
                    { key: 'schedule', label: 'לוח שעות', badge: 0 },
                    { key: 'reports', label: 'דוחות', badge: 0 },
                    { key: 'testimonials', label: 'ביקורות', badge: pendingTestimonialsCount },
                  ] as { key: Tab; label: string; badge: number }[]).map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={`flex-shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        tab === t.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {t.label}
                      {t.badge > 0 && (
                        <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-black">
                          {t.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {tab === 'bookings' && (
                  <BookingsTab
                    bookings={bookings}
                    slots={slots}
                    filter={bookingsFilter}
                    onFilterChange={setBookingsFilter}
                    onLocalChange={setBookings}
                    onRefresh={refreshBookings}
                  />
                )}
                {tab === 'students' && (
                  <StudentsTab
                    bookings={bookings}
                    slots={slots}
                    filter={studentsFilter}
                    onFilterChange={setStudentsFilter}
                    onLocalChange={setBookings}
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
                {tab === 'reports' && <ReportsTab bookings={bookings} />}
                {tab === 'testimonials' && (
                  <TestimonialsTab testimonials={testimonials} onLocalChange={setTestimonials} onRefresh={refreshTestimonials} />
                )}
              </>
            )}
          </div>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  )
}
