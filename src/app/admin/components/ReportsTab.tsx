'use client'

import { useEffect, useState } from 'react'
import { Booking, ReportExportSummary } from '@/lib/types'
import { buildReport, formatPrice } from '@/lib/reports'
import { fetchReportExports, generateReportExport, downloadReportExport } from '@/lib/adminApi'
import { useToast } from './ui/Toast'

export default function ReportsTab({ bookings }: { bookings: Booking[] }) {
  const { byMonth, byStudent, grandTotal } = buildReport(bookings)
  const toast = useToast()

  const [exporting, setExporting] = useState(false)
  const [history, setHistory] = useState<ReportExportSummary[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState(false)

  const loadHistory = () => {
    fetchReportExports()
      .then((data) => { setHistory(data); setHistoryError(false) })
      .catch(() => setHistoryError(true))
      .finally(() => setHistoryLoading(false))
  }

  useEffect(loadHistory, [])

  const handleExport = async () => {
    setExporting(true)
    try {
      await generateReportExport()
      toast('הקובץ יוצא ✓')
      loadHistory()
    } catch {
      toast('שגיאה בייצוא — נסו שוב', 'error')
    } finally {
      setExporting(false)
    }
  }

  const handleDownload = async (id: string) => {
    try {
      await downloadReportExport(id)
    } catch {
      toast('שגיאה בהורדה — נסו שוב', 'error')
    }
  }

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
        <button
          onClick={handleExport}
          disabled={exporting}
          className="mt-4 min-h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors disabled:opacity-60"
        >
          {exporting ? 'מייצא…' : '📊 ייצוא לאקסל'}
        </button>
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

      <section>
        <h3 className="text-sm font-bold text-slate-700 mb-3">היסטוריית ייצוא</h3>
        {historyLoading ? (
          <p className="text-xs text-slate-400 py-4 text-center">טוען…</p>
        ) : historyError ? (
          <p className="text-xs text-red-500 py-4 text-center">שגיאה בטעינת ההיסטוריה</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">עדיין לא בוצע ייצוא</p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-2.5">
                <div>
                  <div className="text-sm text-slate-700">{h.filename}</div>
                  <div className="text-xs text-slate-400">
                    {new Date(h.createdAt).toLocaleString('he-IL')} · {formatPrice(h.grandTotal)} · {h.lessonCount} שיעורים
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(h.id)}
                  className="min-h-10 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  הורדה
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
