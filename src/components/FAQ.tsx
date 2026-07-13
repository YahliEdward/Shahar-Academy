'use client'

import { useState, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap, prefersReducedMotion } from '@/lib/gsap'

const FAQS = [
  {
    q: 'כמה עולה שיעור?',
    a: 'המחיר משתנה לפי סוג הקבוצה וכמות המפגשים בשבוע. שולחים הודעה קצרה בוואטסאפ ונחזור עם מחיר מדויק ומסלול מותאם — בלי הפתעות ובלי התחייבות.',
  },
  {
    q: 'מה קורה אם צריך לבטל שיעור?',
    a: 'מבינים שהחיים קורים. ביטול עד 24 שעות מראש — בלי חיוב. פשוט מעדכנים בוואטסאפ ומוצאים מועד חלופי בלוח.',
  },
  {
    q: 'איך מתבצע הרישום ואיך יודעים שהמקום שוריין?',
    a: 'בוחרים שעה פנויה בלוח השעות, ממלאים טופס קצר — והמקום נשמר לכם באופן זמני. שחר חוזר אליכם טלפונית תוך מספר שעות לאישור סופי ותיאום כל הפרטים.',
  },
  {
    q: 'איך ההורים מקבלים עדכון על ההתקדמות?',
    a: 'שחר שולח עדכון שוטף להורים על התקדמות הילד/ה, נקודות לשיפור והישגים לאורך הדרך — לא רק כשמגיעה תעודה.',
  },
]

function FaqItem({
  q,
  a,
  isOpen,
  onToggle,
}: {
  q: string
  a: string
  isOpen: boolean
  onToggle: () => void
}) {
  const chevronRef = useRef<SVGSVGElement>(null)
  const answerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!chevronRef.current || !answerRef.current) return

    if (prefersReducedMotion()) {
      gsap.set(chevronRef.current, { rotation: isOpen ? 180 : 0 })
      gsap.set(answerRef.current, { opacity: isOpen ? 1 : 0 })
      return
    }

    gsap.to(chevronRef.current, { rotation: isOpen ? 180 : 0, duration: 0.35, ease: 'power2.out' })
    gsap.to(answerRef.current, {
      opacity: isOpen ? 1 : 0,
      duration: isOpen ? 0.4 : 0.15,
      delay: isOpen ? 0.15 : 0,
    })
  }, [isOpen])

  return (
    <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-right"
        aria-expanded={isOpen}
      >
        <span className="font-bold text-slate-900">{q}</span>
        <svg
          ref={chevronRef}
          className="w-5 h-5 text-blue-600 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`faq-answer-wrap ${isOpen ? 'is-open' : ''}`}>
        <div className="faq-answer-inner">
          <div ref={answerRef} className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">
            {a}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="py-16 px-4 max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-slate-900 mb-2">שאלות נפוצות</h2>
        <p className="text-slate-500">כל מה שהורים ותלמידים שואלים לפני שמתחילים</p>
      </div>

      <div className="space-y-3">
        {FAQS.map((f, i) => (
          <FaqItem
            key={i}
            q={f.q}
            a={f.a}
            isOpen={openIndex === i}
            onToggle={() => setOpenIndex((cur) => (cur === i ? null : i))}
          />
        ))}
      </div>
    </section>
  )
}
