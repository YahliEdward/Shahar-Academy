'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap, prefersReducedMotion } from '@/lib/gsap'

type Stat = { value: number; prefix?: string; suffix?: string; label: string }

const DEFAULT_STATS: Stat[] = [
  { value: 100, suffix: '+', label: 'תלמידים ליווינו להצלחה' },
  { value: 98, suffix: '%', label: 'הורים ממליצים עלינו' },
  { value: 22, prefix: '+', label: 'נק׳ שיפור ממוצע בבגרות' },
  { value: 6, label: 'תלמידים מקסימום לקבוצה' },
]

export default function TrustBar({ stats = DEFAULT_STATS }: { stats?: Stat[] }) {
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
      const obj = { val: 0 }
      gsap.to(obj, {
        val: target,
        duration: 1.6,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        onUpdate: () => {
          el.textContent = `${el.dataset.prefix ?? ''}${Math.round(obj.val)}${el.dataset.suffix ?? ''}`
        },
      })
    })
  }, { scope })

  return (
    <section className="px-4 py-10 border-y border-white/5">
      <div ref={scope} className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {stats.map((s, i) => (
          <div key={i}>
            <div
              data-counter
              dir="ltr"
              data-value={s.value}
              data-prefix={s.prefix ?? ''}
              data-suffix={s.suffix ?? ''}
              className="text-3xl sm:text-4xl font-black text-yellow-400"
            >
              {s.prefix}{s.value}{s.suffix}
            </div>
            <div className="text-xs sm:text-sm text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
