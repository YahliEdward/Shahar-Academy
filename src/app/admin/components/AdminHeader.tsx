'use client'

import Link from 'next/link'
import ShaharLogo from '@/components/ShaharLogo'

export default function AdminHeader({ onLogout }: { onLogout: () => void }) {
  return (
    <header className="bg-zinc-900/80 border-b border-zinc-800 sticky top-0 z-40 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="חזרה לדף הבית">
            <ShaharLogo size={40} />
          </Link>
          <span className="font-black text-white">לוח בקרה — שחר</span>
        </div>
        <div className="flex gap-2 items-center">
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">← לאתר</Link>
          <button
            onClick={onLogout}
            className="text-xs px-3 py-1.5 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            יציאה
          </button>
        </div>
      </div>
    </header>
  )
}
