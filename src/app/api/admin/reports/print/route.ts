import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { isAdminConfigured } from '@/lib/supabaseAdmin'
import { getBookings, getSlotLabelMap } from '@/lib/serverDb'
import { buildReportHtml } from '@/lib/reportHtml'

// Serves the report as a print-ready page the admin opens in a new tab and
// saves as PDF. Opened via window.open (a plain navigation, not fetch), so on
// failure it must answer in HTML too — a JSON error body would just render as
// raw text in the new tab.
function htmlError(message: string, status: number) {
  return new NextResponse(
    `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">` +
      `<title>שגיאה</title></head><body style="font-family:Arial,sans-serif;padding:40px;text-align:center">` +
      `<h1 style="font-size:18px">${message}</h1></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

export async function GET() {
  if (!(await isAdmin())) {
    return htmlError('אין הרשאה — התחברו מחדש ללוח הבקרה', 401)
  }
  if (!isAdminConfigured) {
    return htmlError('השרת אינו מוגדר', 503)
  }
  try {
    const [bookings, slotLabels] = await Promise.all([getBookings(), getSlotLabelMap()])
    return new NextResponse(buildReportHtml(bookings, slotLabels), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('report print page failed', err)
    return htmlError('יצירת הדוח נכשלה — נסו שוב', 500)
  }
}
