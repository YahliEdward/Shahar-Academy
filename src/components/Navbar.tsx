'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ShaharLogo from './ShaharLogo'
import { WHATSAPP_URL } from '@/lib/constants'

const LINKS = [
  { id: 'features', label: 'היתרונות שלנו', href: '/#features' },
  { id: 'why-us', label: 'למה דווקא אנחנו', href: '/#why-us' },
  { id: 'about', label: 'על שחר', href: '/#about' },
  { id: 'schedule', label: 'לוח שעות', href: '/schedule' },
  { id: 'testimonials', label: 'המלצות', href: '/#testimonials' },
  { id: 'faq', label: 'שאלות נפוצות', href: '/#faq' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <>
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 flex items-center ${
        scrolled
          ? 'bg-[rgba(11,15,25,0.8)] backdrop-blur-md border-b border-white/10'
          : 'bg-transparent'
      }`}
      style={{ height: scrolled ? '58px' : 'var(--nav-height)' }}
    >
      <nav className="w-full max-w-6xl mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <ShaharLogo size={36} />
          <span className="hidden sm:inline text-sm font-black text-white tracking-tight">
            אקדמיית <span className="text-yellow-400">שחר</span>
          </span>
        </Link>

        <ul className="hidden md:flex items-center gap-6">
          {LINKS.map((link) => (
            <li key={link.id}>
              <Link
                href={link.href}
                className="text-sm font-semibold text-slate-300 hover:text-yellow-400 transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <Link
            href="/schedule"
            className="hidden md:inline-flex px-5 py-2.5 bg-yellow-400 text-black font-black text-sm rounded-lg hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20"
          >
            בחרו שעה
          </Link>

          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="תפריט"
            aria-expanded={menuOpen}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg border border-white/15 text-white"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>
    </header>

      {/* Mobile drawer */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-0 z-50 bg-[rgba(11,15,25,1)] backdrop-blur-md transition-opacity duration-300 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ top: scrolled ? '58px' : 'var(--nav-height)' }}
        inert={!menuOpen}
      >
        <ul className="flex flex-col items-center gap-2 pt-10 px-6">
          {LINKS.map((link) => (
            <li key={link.id} className="w-full">
              <Link
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block w-full text-center py-4 text-lg font-bold text-slate-200 hover:text-yellow-400 transition-colors border-b border-white/5"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-3 px-6 mt-8">
          <Link
            href="/schedule"
            onClick={() => setMenuOpen(false)}
            className="w-full text-center px-8 py-4 bg-yellow-400 text-black font-black text-lg rounded-xl"
          >
            בחרו שעה עכשיו
          </Link>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
            className="w-full text-center px-8 py-4 border border-white/20 text-white font-bold text-lg rounded-xl"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </>
  )
}
