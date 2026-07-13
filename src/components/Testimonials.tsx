import ScrollReveal from './reveal/ScrollReveal'

const testimonials = [
  {
    name: 'מיכל ר.',
    role: 'אמא של יובל, כיתה י"ב',
    text: 'יובל עלה מ-62 ל-91 בתוך שלושה חודשים. שחר מסביר בסבלנות ויודע בדיוק איפה הילד תקוע. ממליצה בחום!',
    stars: 5,
    improvement: '+29 נקודות',
  },
  {
    name: 'אבי כ.',
    role: 'אבא של נועה, כיתה י"א',
    text: 'ניסינו מורים פרטיים רבים לפני שחר. הקבוצה הקטנה עושה הבדל עצום — נועה סוף סוף מרגישה בנוח לשאול שאלות.',
    stars: 5,
    improvement: 'עברה ל-5 יח\'',
  },
  {
    name: 'דנה מ.',
    role: 'תלמידת כיתה י"ב',
    text: 'הגעתי לשחר עם 54 בבגרות. היום אני יודעת שאני יכולה להגיש על 5 יחידות. האווירה בקבוצה מדהימה.',
    stars: 5,
    improvement: '54 → 87',
  },
  {
    name: 'רותי ש.',
    role: 'אמא של תאיר, כיתה ט\'',
    text: 'תאיר פחדה ממתמטיקה שנים. שחר הצליח להפוך אותה לאחת הטובות בכיתה. לא יאמן.',
    stars: 5,
    improvement: 'אוהבת מתמטיקה!',
  },
]

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-16 px-4 max-w-6xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-slate-900 mb-2">מה אומרים עלינו</h2>
        <p className="text-slate-500">סיפורי הצלחה אמיתיים מתלמידים והורים</p>
      </div>

      <ScrollReveal selector=":scope > div" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {testimonials.map((t, i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3 shadow-sm hover:border-blue-300 transition-all"
          >
            <div className="flex gap-0.5">
              {Array.from({ length: t.stars }).map((_, j) => (
                <span key={j} className="text-amber-400 text-sm">★</span>
              ))}
            </div>
            <p className="text-slate-700 text-sm leading-relaxed flex-1">&ldquo;{t.text}&rdquo;</p>
            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
              <div>
                <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                <div className="text-xs text-slate-500">{t.role}</div>
              </div>
              <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold border border-blue-200">
                {t.improvement}
              </span>
            </div>
          </div>
        ))}
      </ScrollReveal>
    </section>
  )
}
