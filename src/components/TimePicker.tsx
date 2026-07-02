'use client'

import { useEffect, useRef, useState } from 'react'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)

const colScrollStyle: React.CSSProperties = {
  scrollbarWidth: 'thin',
  scrollbarColor: '#52525b transparent',
}

export default function TimePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const hourColRef = useRef<HTMLDivElement>(null)
  const minuteColRef = useRef<HTMLDivElement>(null)

  const [hhStr, mmStr] = value.split(':')
  const hh = parseInt(hhStr, 10) || 0
  const mm = parseInt(mmStr, 10) || 0

  const pad = (n: number) => String(n).padStart(2, '0')

  const setHour = (h: number) => {
    onChange(`${pad(h)}:${pad(mm)}`)
  }
  const setMinute = (m: number) => {
    onChange(`${pad(hh)}:${pad(m)}`)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return

    // Center each column on its selected value when the popover opens
    for (const col of [hourColRef.current, minuteColRef.current]) {
      const selected = col?.querySelector<HTMLElement>('[data-selected="true"]')
      if (col && selected) {
        col.scrollTop = selected.offsetTop - col.clientHeight / 2 + selected.clientHeight / 2
      }
    }

    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative inline-block" style={{ direction: 'ltr' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 bg-zinc-700/80 border rounded-lg px-3 py-1.5 text-sm outline-none transition-colors ${
          open ? 'border-yellow-400' : 'border-zinc-600 hover:border-zinc-500'
        }`}
      >
        <span className="font-mono font-bold text-yellow-400 tracking-wide">
          {pad(hh)}:{pad(mm)}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className={`text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M1.5 3.5 L5 7 L8.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1.5 bg-zinc-800 border border-zinc-600 rounded-xl shadow-xl shadow-black/40 overflow-hidden"
          style={{ zIndex: 50 }}
        >
          <div className="flex text-[11px] text-zinc-400 border-b border-zinc-700" style={{ direction: 'rtl' }}>
            <span className="w-14 py-1.5 text-center">שעה</span>
            <span className="w-14 py-1.5 text-center border-r border-zinc-700">דקות</span>
          </div>
          <div className="flex" style={{ direction: 'rtl' }}>
            <div ref={hourColRef} className="flex flex-col h-44 overflow-y-auto w-14 p-1" style={colScrollStyle}>
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  data-selected={h === hh}
                  onClick={() => setHour(h)}
                  className={`font-mono text-sm rounded-md px-2 py-1 text-center shrink-0 transition-colors ${
                    h === hh
                      ? 'bg-yellow-400 text-zinc-900 font-bold'
                      : 'text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {pad(h)}
                </button>
              ))}
            </div>
            <div ref={minuteColRef} className="flex flex-col h-44 overflow-y-auto w-14 p-1 border-r border-zinc-700" style={colScrollStyle}>
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  data-selected={m === mm}
                  onClick={() => setMinute(m)}
                  className={`font-mono text-sm rounded-md px-2 py-1 text-center shrink-0 transition-colors ${
                    m === mm
                      ? 'bg-yellow-400 text-zinc-900 font-bold'
                      : 'text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {pad(m)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
