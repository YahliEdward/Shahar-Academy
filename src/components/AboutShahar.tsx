import Image from 'next/image'
import ScrollReveal from './reveal/ScrollReveal'

const HIGHLIGHTS = [
  {
    title: 'מלמד מתוך אהבה למקצוע',
    text: 'מתמטיקה היא לא רק נוסחאות — היא דרך חשיבה. המטרה שלי היא שכל תלמיד יצא מהשיעור עם ביטחון, לא רק עם פתרון.',
  },
  {
    title: 'שיטה שמותאמת לכל תלמיד',
    text: 'בקבוצות קטנות אפשר באמת להכיר כל תלמיד — לזהות איפה הוא נתקע ולבנות איתו את הדרך קדימה, צעד אחר צעד.',
  },
  {
    title: 'זמין גם אחרי השיעור',
    text: 'נתקעתם על תרגיל בבית? שולחים הודעה בוואטסאפ ומקבלים מענה. הליווי לא נגמר כשהשיעור מסתיים.',
  },
]

export default function AboutShahar() {
  return (
    <section id="about" className="py-16 px-4 max-w-6xl mx-auto">
      <ScrollReveal
        selector=":scope > *"
        className="grid lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-14 items-center"
      >
        <div className="relative max-w-sm mx-auto lg:max-w-none w-full">
          <div className="absolute -inset-3 rounded-3xl bg-yellow-400/10 border border-yellow-400/20 rotate-2" />
          <Image
            src="/shahar.jpg"
            alt="שחר — מורה פרטי למתמטיקה"
            width={800}
            height={1000}
            className="relative rounded-2xl border border-zinc-700/50 object-cover"
          />
          <div className="absolute bottom-4 right-4 bg-[rgba(11,15,25,0.85)] backdrop-blur-sm border border-yellow-400/30 rounded-xl px-4 py-2">
            <div className="font-black text-white">שחר</div>
            <div className="text-xs text-yellow-300">מורה פרטי למתמטיקה</div>
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-black text-white mb-2">מי עומד מאחורי הלימודים</h2>
          <p className="text-slate-400 mb-6">נעים להכיר — שחר</p>

          <p className="text-slate-300 leading-relaxed mb-8">
            נעים מאוד, אני שחר. אני מלמד מתוך אמונה פשוטה: אין תלמיד ש&quot;לא מסוגל&quot;
            במתמטיקה — יש רק תלמיד שעוד לא קיבל את ההסבר הנכון, בקצב הנכון, באווירה הנכונה.
            בקבוצות הקטנות שלנו, בבית שלי, כל תלמיד מקבל בדיוק את זה.
          </p>

          <div className="flex flex-col gap-5">
            {HIGHLIGHTS.map((h, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-10 h-10 shrink-0 rounded-full bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center text-yellow-400 font-black">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">{h.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{h.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  )
}
