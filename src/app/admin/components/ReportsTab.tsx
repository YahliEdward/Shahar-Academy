'use client'

import { Booking } from '@/lib/types'
import { buildReport, formatPrice } from '@/lib/reports'

export default function ReportsTab({ bookings }: { bookings: Booking[] }) {
  const { byMonth, byStudent, grandTotal } = buildReport(bookings)

  if (byMonth.length === 0 && byStudent.length === 0) {
    return (
      <p className="text-center text-slate-400 py-10 text-sm">
        אין נתונים עדיין — הכנסות יופיעו כאן לאחר שיוגדר מחיר לתלמידים מאושרים
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 text-center shadow-sm">
        <div className="text-3xl font-black text-blue-600" dir="ltr">{formatPrice(grandTotal)}</div>
        <div className="text-xs text-slate-500 font-semibold mt-1">סה״כ הכנסה (מאושרים בלבד)</div>
      </div>

      <section>
        <h3 className="text-sm font-bold text-slate-700 mb-3">לפי חודש</h3>
        <div className="space-y-2">
          {byMonth.map((m) => (
            <div key={m.monthKey} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-2.5">
              <span className="text-sm text-slate-700">{m.label}</span>
              <span className="text-sm font-bold text-slate-900" dir="ltr">{formatPrice(m.total)}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold text-slate-700 mb-3">לפי תלמיד</h3>
        <div className="space-y-2">
          {byStudent.map((s) => (
            <div key={s.studentName} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-2.5">
              <div>
                <div className="text-sm text-slate-700">{s.studentName}</div>
                <div className="text-xs text-slate-400">{s.lessonCount} שיעורים מאושרים</div>
              </div>
              <span className="text-sm font-bold text-slate-900" dir="ltr">{formatPrice(s.total)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
