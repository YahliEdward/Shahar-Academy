'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useScrollLock } from '@/lib/useScrollLock'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  danger?: boolean
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false))

export function useConfirm() {
  return useContext(ConfirmContext)
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<{ opts: ConfirmOptions; resolve: (v: boolean) => void } | null>(null)

  const confirm = useCallback<ConfirmFn>(
    (opts) => new Promise((resolve) => setPending({ opts, resolve })),
    []
  )

  const close = useCallback((result: boolean) => {
    setPending((p) => {
      p?.resolve(result)
      return null
    })
  }, [])

  useScrollLock(pending !== null)

  useEffect(() => {
    if (!pending) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [pending, close])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) close(false) }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={pending.opts.title}
            className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 fade-in-up"
          >
            <h3 className="font-black text-slate-900 text-lg">{pending.opts.title}</h3>
            {pending.opts.message && (
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{pending.opts.message}</p>
            )}
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => close(true)}
                autoFocus
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                  pending.opts.danger
                    ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {pending.opts.confirmLabel ?? 'אישור'}
              </button>
              <button
                onClick={() => close(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
