'use client'

import { Testimonial } from '@/lib/types'
import { patchTestimonial, removeTestimonial } from '@/lib/adminApi'
import { useToast } from './ui/Toast'
import { useConfirm } from './ui/ConfirmDialog'

export default function TestimonialCard({ testimonial, onRefresh }: {
  testimonial: Testimonial
  onRefresh: () => void
}) {
  const toast = useToast()
  const confirmDialog = useConfirm()
  const isPending = testimonial.status === 'pending'

  const approve = async () => {
    try {
      await patchTestimonial(testimonial.id, 'approved')
      toast('הביקורת אושרה ✓')
      onRefresh()
    } catch {
      toast('שגיאה באישור — נסו שוב', 'error')
    }
  }

  const reject = async () => {
    try {
      await patchTestimonial(testimonial.id, 'rejected')
      toast('הביקורת נדחתה')
      onRefresh()
    } catch {
      toast('שגיאה בדחייה — נסו שוב', 'error')
    }
  }

  const remove = async () => {
    if (!(await confirmDialog({
      title: 'להסיר את הביקורת?',
      message: `הביקורת של ${testimonial.name} תוסר לצמיתות מהאתר.`,
      confirmLabel: 'הסר',
      danger: true,
    }))) return
    try {
      await removeTestimonial(testimonial.id)
      toast('הביקורת הוסרה')
      onRefresh()
    } catch {
      toast('שגיאה בהסרה — נסו שוב', 'error')
    }
  }

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${isPending ? 'border-slate-200 bg-white' : 'border-green-300 bg-green-50/60'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900">{testimonial.name}</span>
            <span className="flex gap-0.5">
              {Array.from({ length: testimonial.stars }).map((_, j) => (
                <span key={j} className="text-amber-400 text-xs">★</span>
              ))}
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">&ldquo;{testimonial.text}&rdquo;</p>
          <div className="text-xs text-slate-400 mt-1.5">
            נשלח: {new Date(testimonial.createdAt).toLocaleString('he-IL')}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {isPending ? (
          <>
            <button
              onClick={approve}
              className="min-h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors"
            >
              ✓ אשר
            </button>
            <button
              onClick={reject}
              className="min-h-10 px-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-semibold transition-colors border border-red-200"
            >
              ✗ דחה
            </button>
          </>
        ) : (
          <button
            onClick={remove}
            className="min-h-10 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs transition-colors border border-red-200"
          >
            הסר מהאתר
          </button>
        )}
      </div>
    </div>
  )
}
