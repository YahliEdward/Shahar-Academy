import Hero from '@/components/Hero'
import ScheduleGrid from '@/components/ScheduleGrid'
import Testimonials from '@/components/Testimonials'
import Link from 'next/link'

export default function HomePage() {
  return (
    <main>
      <Hero />
      <ScheduleGrid />
      <Testimonials />

      <footer className="border-t border-zinc-800 py-8 px-4 text-center text-sm text-zinc-600">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>© {new Date().getFullYear()} האקדמיה למתמטיקה של שחר. כל הזכויות שמורות.</div>
          <Link
            href="/admin"
            className="text-zinc-700 hover:text-zinc-400 transition-colors text-xs"
          >
            כניסה למורה
          </Link>
        </div>
      </footer>
    </main>
  )
}
