'use client'

import { useState } from 'react'
import Link from 'next/link'
import { adminLogin } from '@/lib/adminApi'
import ShaharLogo from '@/components/ShaharLogo'

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { ok, error: loginError } = await adminLogin(pw)
    setLoading(false)
    if (ok) onLogin()
    else setError(loginError ?? 'סיסמה שגויה')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 math-bg">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xl">
        <div className="flex justify-center mb-5">
          <Link href="/" aria-label="חזרה לדף הבית">
            <ShaharLogo size={72} />
          </Link>
        </div>
        <h1 className="text-xl font-black text-slate-900 mb-1">אזור המורים</h1>
        <p className="text-sm text-slate-500 mb-6">כניסה מוגבלת לשחר בלבד</p>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="password"
            placeholder="סיסמה"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setError('') }}
            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-center tracking-widest text-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
            autoFocus
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {loading ? 'בודק…' : 'כניסה'}
          </button>
        </form>
        <Link href="/" className="block mt-4 text-xs text-slate-400 hover:text-slate-600 transition-colors">
          ← חזרה לאתר
        </Link>
      </div>
    </div>
  )
}
