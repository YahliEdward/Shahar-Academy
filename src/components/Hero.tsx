'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import ShaharLogo from './ShaharLogo'
import HeroVisual from './HeroVisual'
import { PHONE, WHATSAPP_URL } from '@/lib/constants'

export default function Hero() {
  const [contactOpen, setContactOpen] = useState(false)
  const contactRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (contactRef.current && !contactRef.current.contains(e.target as Node)) {
        setContactOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!contactOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContactOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [contactOpen])

  return (
    <section
      className="relative min-h-0 sm:min-h-[90vh] flex items-start sm:items-center justify-center px-4 pt-20 sm:pt-24 md:pt-32 pb-20 overflow-hidden"
    >
      <div className="relative z-10 w-full max-w-6xl mx-auto grid lg:grid-cols-[1.15fr_1fr] gap-10 items-center">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-right">
          <div className="hero-logo fade-in-up mb-6 hidden sm:flex items-center gap-3">
            <Link href="/" aria-label="חזרה לדף הבית">
              <ShaharLogo size={60} className="drop-shadow-lg" />
            </Link>
            <span className="text-2xl font-black text-white tracking-tight">
              האקדמיה למתמטיקה <span className="text-yellow-400">של שחר</span>
            </span>
          </div>

          <h1
            className="hero-heading fade-in-up text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-6 text-white"
            style={{ animationDelay: '0.08s' }}
          >
            הדרך שלכם ל‑
            <span className="text-yellow-400 relative">
              5 יחידות
              <svg className="absolute bottom-1 right-0 w-full" viewBox="0 0 200 8" fill="none">
                <path d="M0 6 Q100 0 200 6" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </span>{' '}
            מתחילה כאן
          </h1>

          <p
            className="hero-tagline fade-in-up text-lg text-slate-300 mb-4 leading-relaxed max-w-lg"
            style={{ animationDelay: '0.14s' }}
          >
            קבוצות למידה קטנות ואישיות בבית שחר — עד <strong className="text-yellow-400">6 תלמידים בלבד</strong> לכל קבוצה.
            תשומת לב מקסימלית, תוצאות אמיתיות.
          </p>

          <div
            className="hero-badges fade-in-up flex flex-wrap justify-center lg:justify-start gap-4 mb-10 text-sm text-slate-400"
            style={{ animationDelay: '0.2s' }}
          >
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              חטיבת ביניים
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
              תיכון 4 יח&apos;
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
              תיכון 5 יח&apos;
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              קבוצות מעורבות
            </span>
          </div>

          <div
            className="hero-ctas fade-in-up flex flex-row gap-3 w-full sm:w-auto"
            style={{ animationDelay: '0.26s' }}
          >
            <Link
              href="/schedule"
              className="flex-1 sm:flex-none whitespace-nowrap px-4 sm:px-8 py-4 bg-yellow-400 text-black font-black text-lg rounded-xl hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20 hover:shadow-yellow-400/40 hover:-translate-y-0.5 text-center"
            >
              בחרו שעה עכשיו ←
            </Link>
            <div ref={contactRef} className="relative flex-1 sm:flex-none">
              <button
                onClick={() => setContactOpen(o => !o)}
                className="w-full sm:w-auto justify-center whitespace-nowrap px-4 sm:px-8 py-4 border border-white/20 text-white font-bold text-lg rounded-xl hover:bg-white/5 transition-all flex items-center gap-1.5"
              >
                יצירת קשר
                <svg className={`w-3.5 h-3.5 transition-transform ${contactOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {contactOpen && (
                <div className="absolute top-full mt-2 right-0 bg-slate-800 border border-white/10 rounded-xl overflow-hidden shadow-xl z-50 min-w-full">
                  <a
                    href={`tel:${PHONE}`}
                    className="flex items-center gap-3 px-5 py-3 text-white hover:bg-white/10 transition-colors text-base font-semibold"
                    onClick={() => setContactOpen(false)}
                  >
                    📞 שיחה
                  </a>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-5 py-3 text-white hover:bg-white/10 transition-colors text-base font-semibold border-t border-white/10"
                    onClick={() => setContactOpen(false)}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#25D366] shrink-0" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="hero-visual fade-in-up hidden lg:block" style={{ animationDelay: '0.1s' }}>
          <HeroVisual />
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-500 text-xs">
        <span>גללו להכיר אותנו</span>
        <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  )
}
