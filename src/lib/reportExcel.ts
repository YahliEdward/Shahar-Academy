// Builds the literal .xlsx buffer for a report export — summary sheets plus
// a full lesson-breakdown sheet, all derived from buildReport/buildDetailRows
// so this can never disagree with the on-screen report or with itself.
import * as XLSX from 'xlsx'
import { Booking } from './types'
import { buildReport, buildDetailRows } from './reports'

export function buildReportWorkbook(bookings: Booking[]): {
  buffer: Buffer
  grandTotal: number
  lessonCount: number
} {
  const { byMonth, byStudent, grandTotal } = buildReport(bookings)
  const detail = buildDetailRows(bookings)

  const wb = XLSX.utils.book_new()

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['סה"כ הכנסה (מאושרים בלבד)', grandTotal],
  ])
  XLSX.utils.book_append_sheet(wb, summarySheet, 'סיכום כללי')

  const byMonthSheet = XLSX.utils.json_to_sheet(
    byMonth.map((m) => ({ 'חודש': m.label, 'סה"כ (₪)': m.total }))
  )
  XLSX.utils.book_append_sheet(wb, byMonthSheet, 'לפי חודש')

  const byStudentSheet = XLSX.utils.json_to_sheet(
    byStudent.map((s) => ({ 'תלמיד': s.studentName, 'מספר שיעורים': s.lessonCount, 'סה"כ (₪)': s.total }))
  )
  XLSX.utils.book_append_sheet(wb, byStudentSheet, 'לפי תלמיד')

  const detailSheet = XLSX.utils.json_to_sheet(
    detail.map((d) => ({ 'תלמיד': d.studentName, 'חודש': d.monthLabel, 'משבצת': d.slotLabel, 'מחיר (₪)': d.price }))
  )
  XLSX.utils.book_append_sheet(wb, detailSheet, 'פירוט שיעורים')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return { buffer, grandTotal, lessonCount: detail.length }
}

// Israel-local timestamped filename, e.g. "דוח-הכנסות-2026-07-15-1420.xlsx".
export function buildExportFilename(): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short',
  }).formatToParts(new Date())
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `דוח-הכנסות-${get('year')}-${get('month')}-${get('day')}-${get('hour')}${get('minute')}.xlsx`
}
