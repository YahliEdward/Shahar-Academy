'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ShaharLogo from './ShaharLogo'
import { WHATSAPP_URL } from '@/lib/constants'
import { adminSession } from '@/lib/adminApi'
import { useScrollLock } from '@/lib/useScrollLock'

const LINKS = [
  { id: 'features', label: 'יתרונות', href: '/#features' },
  { id: 'why-us', label: 'למה דווקא שחר', href: '/#why-us' },
  { id: 'about', label: 'על שחר', href: '/#about' },
  { id: 'testimonials', label: 'המלצות', href: '/#testimonials' },
  { id: 'faq', label: 'שאלות נוספות', href: '/#faq' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    adminSession().then(setIsAdmin)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useScrollLock(menuOpen)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <>
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 flex items-center ${
        scrolled
          ? 'bg-white/85 backdrop-blur-md border-b border-slate-200 shadow-sm'
          : 'bg-transparent'
      }`}
      style={{ height: scrolled ? '58px' : 'var(--nav-height)' }}
    >
      <nav className="w-full max-w-6xl mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <ShaharLogo size={44} />
          <span className="hidden sm:inline text-sm font-black text-slate-900 tracking-tight">
            שחר <span className="text-blue-600">מורה פרטי</span>
          </span>
        </Link>

        <ul className="hidden md:flex items-center gap-6">
          {LINKS.map((link) => (
            <li key={link.id}>
              <Link
                href={link.href}
                className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              href="/admin"
              className="hidden md:inline-flex px-4 py-2.5 bg-slate-100 text-slate-500 font-bold text-sm rounded-lg hover:text-slate-900 hover:bg-slate-200 transition-all"
            >
              ניהול
            </Link>
          )}

          <Link
            href="/schedule"
            className="hidden md:inline-flex px-5 py-2.5 bg-blue-600 text-white font-black text-sm rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
          >
            בחרו שעה
          </Link>

          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="תפריט"
            aria-expanded={menuOpen}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg border border-slate-300 text-slate-700"
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
        className={`md:hidden fixed inset-x-0 bottom-0 z-50 bg-white transition-opacity duration-300 ${
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
                className="block w-full text-center py-4 text-lg font-bold text-slate-700 hover:text-blue-600 transition-colors border-b border-slate-100"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-3 px-6 mt-8">
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className="w-full text-center px-8 py-4 bg-slate-100 text-slate-700 font-bold text-lg rounded-xl"
            >
              ניהול
            </Link>
          )}
          <Link
            href="/schedule"
            onClick={() => setMenuOpen(false)}
            className="w-full text-center px-8 py-4 bg-blue-600 text-white font-black text-lg rounded-xl"
          >
            בחרו שעה עכשיו
          </Link>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
            className="w-full text-center px-8 py-4 border border-slate-300 text-slate-700 font-bold text-lg rounded-xl"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </>
  )
}
