import Link from 'next/link'
import { WHATSAPP_URL } from '@/lib/constants'

export default function FinalCTA() {
  return (
    <section id="cta" className="relative py-20 px-4 overflow-hidden">
      <div className="max-w-3xl mx-auto text-center bg-gradient-to-b from-blue-50 to-white border border-blue-200 rounded-3xl p-10 sm:p-14 shadow-sm">
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
          מוכנים להתחיל את הדרך ל־<span className="text-blue-600">5 יחידות</span>?
        </h2>
        <p className="text-slate-700 mb-8 max-w-xl mx-auto leading-relaxed">
          המקומות בכל קבוצה מוגבלים ל־6 תלמידים בלבד. בחרו שעה פנויה עכשיו — לפני שהיא נתפסת.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/schedule"
            className="px-8 py-4 bg-blue-600 text-white font-black text-lg rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 hover:-translate-y-0.5"
          >
            בחרו שעה עכשיו ←
          </Link>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 border border-slate-300 text-slate-700 font-bold text-lg rounded-xl hover:bg-slate-100 transition-all"
          >
            שאלו אותנו בוואטסאפ
          </a>
        </div>
      </div>
    </section>
  )
}
