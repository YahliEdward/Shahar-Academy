'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'

type ToastType = 'success' | 'error'
interface ToastItem { id: number; message: string; type: ToastType }

const ToastContext = createContext<(message: string, type?: ToastType) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

// Single-toast display: a new toast replaces the current one, so rapid edits
// (e.g. tapping +/- on the enrolled stepper) don't stack a pile of pills.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null)
  const nextId = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId.current++
    setToast({ id, message, type })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 2200)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className="fixed bottom-5 inset-x-0 z-[60] flex justify-center pointer-events-none">
          <div
            key={toast.id}
            role="status"
            className={`toast-in bg-zinc-900 border border-zinc-700 rounded-full px-5 py-2.5 text-sm font-bold shadow-2xl ${
              toast.type === 'success' ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}
