import type { Metadata } from 'next'
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
      <div className="pt-32">
        <ScheduleGrid />
      </div>
      <Footer />
    </main>
  )
}
