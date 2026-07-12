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
  const [detailed, setDetailed] = useState(false)
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
  const pickWholeHour = (h: number) => {
    onChange(`${pad(h)}:00`)
    setOpen(false)
  }

  // Opening the popover decides up front whether the minutes column shows,
  // so the effect below only handles scroll-centering and outside-click.
  const toggleOpen = () => {
    if (open) {
      setOpen(false)
      return
    }
    setDetailed(mm !== 0)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    // Center the hour column on its selected value when the popover opens
    const selected = hourColRef.current?.querySelector<HTMLElement>('[data-selected="true"]')
    if (hourColRef.current && selected) {
      hourColRef.current.scrollTop = selected.offsetTop - hourColRef.current.clientHeight / 2 + selected.clientHeight / 2
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

  useEffect(() => {
    if (!open || !detailed) return
    const selected = minuteColRef.current?.querySelector<HTMLElement>('[data-selected="true"]')
    if (minuteColRef.current && selected) {
      minuteColRef.current.scrollTop = selected.offsetTop - minuteColRef.current.clientHeight / 2 + selected.clientHeight / 2
    }
  }, [open, detailed])

  return (
    <div ref={containerRef} className="relative inline-block" style={{ direction: 'ltr' }}>
      <button
        type="button"
        onClick={toggleOpen}
        className={`flex items-center bg-zinc-800 border rounded-lg px-3 py-1.5 text-sm outline-none transition-colors ${
          open
            ? 'border-yellow-400 ring-1 ring-yellow-400/20'
            : 'border-zinc-700 hover:border-zinc-500'
        }`}
      >
        <span className={`tabular-nums font-medium ${open ? 'text-yellow-400' : 'text-zinc-200'}`}>
          {pad(hh)}:{pad(mm)}
        </span>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1.5 bg-zinc-800 border border-zinc-600 rounded-xl shadow-xl shadow-black/40 overflow-hidden"
          style={{ zIndex: 50 }}
        >
          <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-zinc-700 pr-1">
            <span className="w-14 py-1.5 text-center">שעה</span>
            <button
              type="button"
              onClick={() => setDetailed((d) => !d)}
              aria-label="ערוך דקות"
              className={`p-1 rounded transition-colors ${detailed ? 'text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M9.5 1.5 L12.5 4.5 L4.5 12.5 L1.5 12.5 L1.5 9.5 Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
            </button>
            {detailed && <span className="w-14 py-1.5 text-center border-l border-zinc-700">דקות</span>}
          </div>
          <div className="flex">
            <div ref={hourColRef} className="flex flex-col h-44 overflow-y-auto w-14 p-1" style={colScrollStyle}>
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  data-selected={detailed ? h === hh : h === hh && mm === 0}
                  onClick={() => (detailed ? setHour(h) : pickWholeHour(h))}
                  className={`tabular-nums text-sm rounded-md px-2 py-1 text-center shrink-0 transition-colors ${
                    (detailed ? h === hh : h === hh && mm === 0)
                      ? 'bg-yellow-400/15 text-yellow-400 font-medium'
                      : 'text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {pad(h)}
                </button>
              ))}
            </div>
            {detailed && (
              <div ref={minuteColRef} className="flex flex-col h-44 overflow-y-auto w-14 p-1 border-l border-zinc-700" style={colScrollStyle}>
                {MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    data-selected={m === mm}
                    onClick={() => setMinute(m)}
                    className={`tabular-nums text-sm rounded-md px-2 py-1 text-center shrink-0 transition-colors ${
                      m === mm
                        ? 'bg-yellow-400/15 text-yellow-400 font-medium'
                        : 'text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {pad(m)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
