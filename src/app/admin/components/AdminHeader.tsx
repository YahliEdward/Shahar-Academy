'use client'

import Link from 'next/link'
import ShaharLogo from '@/components/ShaharLogo'

export default function AdminHeader({ onLogout }: { onLogout: () => void }) {
  return (
    <header className="bg-white/85 border-b border-slate-200 sticky top-0 z-40 backdrop-blur-sm shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="חזרה לדף הבית">
            <ShaharLogo size={40} />
          </Link>
          <span className="font-black text-slate-900">לוח בקרה — שחר</span>
        </div>
        <div className="flex gap-2 items-center">
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">← לאתר</Link>
          <button
            onClick={onLogout}
            className="text-xs px-3 py-1.5 bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
          >
            יציאה
          </button>
        </div>
      </div>
    </header>
  )
}
