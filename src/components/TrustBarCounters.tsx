'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap, prefersReducedMotion } from '@/lib/gsap'

export type Stat = { value: number; prefix?: string; suffix?: string; label: string; decimals?: number }

function gridColsClass(n: number): string {
  if (n <= 3) return 'grid-cols-1 sm:grid-cols-3'
  if (n === 4) return 'grid-cols-2 md:grid-cols-4'
  return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
}

export default function TrustBarCounters({ stats }: { stats: Stat[] }) {
  const scope = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const counters = scope.current?.querySelectorAll<HTMLElement>('[data-counter]')
    if (!counters?.length) return

    if (prefersReducedMotion()) {
      counters.forEach((el) => {
        el.textContent = `${el.dataset.prefix ?? ''}${el.dataset.value}${el.dataset.suffix ?? ''}`
      })
      return
    }

    counters.forEach((el) => {
      const target = Number(el.dataset.value)
      const decimals = Number(el.dataset.decimals ?? 0)
      const obj = { val: 0 }
      gsap.to(obj, {
        val: target,
        duration: 1.6,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        onUpdate: () => {
          el.textContent = `${el.dataset.prefix ?? ''}${obj.val.toFixed(decimals)}${el.dataset.suffix ?? ''}`
        },
      })
    })
  }, { scope })

  const gridClass = `grid ${gridColsClass(stats.length)} gap-6 text-center`

  return (
    <div ref={scope} className={`max-w-6xl 2xl:max-w-7xl mx-auto ${gridClass}`}>
      {stats.map((s, i) => {
        const displayValue = s.decimals != null ? s.value.toFixed(s.decimals) : String(s.value)
        return (
          <div key={i}>
            <div
              data-counter
              dir="ltr"
              data-value={displayValue}
              data-prefix={s.prefix ?? ''}
              data-suffix={s.suffix ?? ''}
              data-decimals={s.decimals ?? 0}
              className="text-3xl sm:text-4xl font-black text-blue-600"
            >
              {s.prefix}{displayValue}{s.suffix}
            </div>
            <div className="text-xs sm:text-sm text-slate-500 mt-1">{s.label}</div>
          </div>
        )
      })}
    </div>
  )
}
