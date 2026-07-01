import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import ScheduleGrid from '@/components/ScheduleGrid'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'לוח שעות | האקדמיה למתמטיקה של שחר',
  description: 'בחרו יום ושעה שמתאימים לכם ושריינו מקום בקבוצה.',
}

export default function SchedulePage() {
  return (
    <main>
      <Navbar />
      <div className="pt-20 sm:pt-24">
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-yellow-400 transition-colors"
          >
            <span aria-hidden>→</span> חזרה לדף הבית
          </Link>
        </div>
        <ScheduleGrid />
      </div>
      <Footer />
    </main>
  )
}
