'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

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

  useEffect(() => {
    if (!pending) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false)
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [pending, close])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) close(false) }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={pending.opts.title}
            className="w-full max-w-sm bg-[#131827] rounded-2xl border border-zinc-700/50 shadow-2xl p-5 fade-in-up"
          >
            <h3 className="font-black text-white text-lg">{pending.opts.title}</h3>
            {pending.opts.message && (
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{pending.opts.message}</p>
            )}
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => close(true)}
                autoFocus
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                  pending.opts.danger
                    ? 'bg-red-900/40 hover:bg-red-800/60 text-red-400 border border-red-800/40'
                    : 'bg-yellow-400 hover:bg-yellow-300 text-black'
                }`}
              >
                {pending.opts.confirmLabel ?? 'אישור'}
              </button>
              <button
                onClick={() => close(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-sm transition-colors"
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
