import ScrollReveal from './reveal/ScrollReveal'

const FEATURES = [
  {
    title: 'קבוצות אמיתיות של עד 6 תלמידים',
    description: 'לא עוד כיתה של 30. קבוצה קטנה שבה כל שאלה נשמעת — גם זו שהיה מביך לשאול מול כולם.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-1a4 4 0 00-3-3.87M9 20H2v-1a4 4 0 013-3.87m9-3.13a4 4 0 11-8 0 4 4 0 018 0zm6 2a3 3 0 10-4-2.83" />
      </svg>
    ),
  },
  {
    title: 'שריון מקום אונליין תוך דקה',
    description: 'בוחרים שעה פנויה בלוח, ממלאים טופס קצר — והמקום שמור לכם. שחר חוזר אליכם באותו יום לאישור סופי.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.93 7.93 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    title: 'עדכון שוטף להורים',
    description: 'ההורים מקבלים תמונה אמיתית של ההתקדמות לאורך הדרך — לא רק כשמגיעה תעודה.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm6 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0a2 2 0 01-2 2h-2a2 2 0 01-2-2m0 0V5a2 2 0 012-2h.01" />
      </svg>
    ),
  },
]

export default function Features() {
  return (
    <section id="features" className="py-16 px-4 max-w-6xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-slate-900 mb-2">למה ההורים והתלמידים בוחרים בנו</h2>
        <p className="text-slate-500">שלושה דברים שבאמת עושים הבדל בדרך ל־5 יחידות</p>
      </div>

      <ScrollReveal selector=":scope > div" className="grid md:grid-cols-3 gap-5">
        {FEATURES.map((f, i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-blue-300 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-4">
              {f.icon}
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{f.description}</p>
          </div>
        ))}
      </ScrollReveal>
    </section>
  )
}
