'use client'

import { Testimonial } from '@/lib/types'
import TestimonialCard from './TestimonialCard'

export default function TestimonialsTab({ testimonials, onRefresh }: {
  testimonials: Testimonial[]
  onRefresh: () => void
}) {
  const pending = testimonials.filter((t) => t.status === 'pending')
  const approved = testimonials.filter((t) => t.status === 'approved')

  return (
    <div className="space-y-8">
      <section>
        <h3 className="font-black text-slate-900 mb-3">ממתינות לאישור</h3>
        {pending.length === 0 ? (
          <p className="text-sm text-slate-400">אין ביקורות ממתינות.</p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {pending.map((t) => (
              <TestimonialCard key={t.id} testimonial={t} onRefresh={onRefresh} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="font-black text-slate-900 mb-3">מאושרות (מוצגות באתר)</h3>
        {approved.length === 0 ? (
          <p className="text-sm text-slate-400">אין ביקורות מאושרות עדיין.</p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {approved.map((t) => (
              <TestimonialCard key={t.id} testimonial={t} onRefresh={onRefresh} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
