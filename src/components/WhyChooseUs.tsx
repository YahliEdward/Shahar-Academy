import ScrollReveal from './reveal/ScrollReveal'

const REASONS = [
  {
    title: 'ניסיון מוכח בבגרויות',
    text: 'מלווים תלמידים להצלחה ב־4 וב־5 יחידות שנה אחר שנה, עם תוצאות שרואים בציונים.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 21h8m-4-4v4M6 3h12v4a6 6 0 01-12 0V3zM6 6H4a2 2 0 002 2m12-2h2a2 2 0 01-2 2" />
      </svg>
    ),
  },
  {
    title: 'אווירה תומכת, לא מביכה',
    text: 'קבוצה קטנה של בני אותו גיל — אפשר לשאול כל שאלה בלי פחד להיראות "לא מבינים".',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h.01M15 12h.01M8 15c.7.8 1.8 1.3 4 1.3s3.3-.5 4-1.3M12 21a9 9 0 100-18 9 9 0 000 18z" />
      </svg>
    ),
  },
  {
    title: 'גמישות בלוח הזמנים',
    text: 'בוחרים את היום והשעה שמתאימים ללוח החוגים והשיעורים הפרטיים שלכם.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3M3 11h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
      </svg>
    ),
  },
  {
    title: 'תקשורת ישירה ומהירה',
    text: 'כל שאלה או עדכון — הודעת וואטסאפ אחת, בלי בירוקרטיה ובלי לחכות לימי הורים.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
]

export default function WhyChooseUs() {
  return (
    <section id="why-us" className="py-16 px-4 max-w-6xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-white mb-2">למה דווקא אקדמיית שחר</h2>
        <p className="text-slate-400">ארבע סיבות שבזכותן הורים ותלמידים ממליצים הלאה</p>
      </div>

      <ScrollReveal selector=":scope > div" className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
        {REASONS.map((r, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center text-yellow-400 mb-4">
              {r.icon}
            </div>
            <h3 className="font-bold text-white mb-2">{r.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{r.text}</p>
          </div>
        ))}
      </ScrollReveal>
    </section>
  )
}
