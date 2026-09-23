import ScrollReveal from './reveal/ScrollReveal'
import AddReviewButton from './AddReviewButton'
import { getApprovedTestimonials } from '@/lib/serverDb'

export default async function Testimonials() {
  const testimonials = await getApprovedTestimonials()

  // Until the first review is approved, a bare "no reviews yet" line undersells
  // the site. Show only a short invitation instead — the section (and its
  // #testimonials anchor, used by the navbar and by review-request links) stays
  // so students can still reach the add-review button.
  if (testimonials.length === 0) {
    return (
      <section id="testimonials" className="py-12 px-4 max-w-6xl 2xl:max-w-7xl mx-auto text-center">
        <h2 className="text-2xl font-black text-slate-900 mb-2">למדתם אצל שחר?</h2>
        <p className="text-slate-500 mb-6">נשמח לשמוע איך היה — הביקורת שלכם תעזור לתלמידים אחרים</p>
        <div className="flex justify-center">
          <AddReviewButton />
        </div>
      </section>
    )
  }

  return (
    <section id="testimonials" className="py-16 px-4 max-w-6xl 2xl:max-w-7xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-slate-900 mb-2">מה אומרים עלינו</h2>
        <p className="text-slate-500">סיפורי הצלחה אמיתיים מתלמידים והורים</p>
      </div>

      <ScrollReveal selector=":scope > div" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {testimonials.map((t) => (
          <div
            key={t.id}
            className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3 shadow-sm hover:border-blue-300 transition-all"
          >
            <div className="flex gap-0.5">
              {Array.from({ length: t.stars }).map((_, j) => (
                <span key={j} className="text-amber-400 text-sm">★</span>
              ))}
            </div>
            <p className="text-slate-700 text-sm leading-relaxed flex-1">&ldquo;{t.text}&rdquo;</p>
            <div className="font-bold text-slate-900 text-sm border-t border-slate-200 pt-3">{t.name}</div>
          </div>
        ))}
      </ScrollReveal>

      <div className="mt-8 flex justify-center">
        <AddReviewButton />
      </div>
    </section>
  )
}
