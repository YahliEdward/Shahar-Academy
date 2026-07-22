import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import ScheduleGrid from '@/components/ScheduleGrid'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'לוח שעות | שחר מורה פרטי',
  description: 'בחרו יום ושעה שמתאימים לכם ושריינו מקום בקבוצה.',
}

export default function SchedulePage() {
  return (
    <main>
      <Navbar />
      <div className="pt-20 sm:pt-24">
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors"
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
