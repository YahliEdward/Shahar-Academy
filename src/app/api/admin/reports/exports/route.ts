import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { isAdminConfigured } from '@/lib/supabaseAdmin'
import { getBookings, saveReportExport, getReportExports } from '@/lib/serverDb'
import { buildReportWorkbook, buildExportFilename } from '@/lib/reportExcel'

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdminConfigured) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  }
  try {
    const exports = await getReportExports()
    return NextResponse.json({ exports })
  } catch {
    return NextResponse.json({ error: 'טעינת היסטוריית הייצוא נכשלה' }, { status: 500 })
  }
}

// Generates a fresh export from the live bookings, saves it permanently to
// history, and streams the same bytes back for immediate download.
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdminConfigured) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  }
  try {
    const bookings = await getBookings()
    const { buffer, grandTotal, lessonCount } = buildReportWorkbook(bookings)
    const filename = buildExportFilename()
    const saved = await saveReportExport({ filename, buffer, grandTotal, lessonCount })
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'X-Export-Id': saved.id,
      },
    })
  } catch (err) {
    console.error('report export generation failed', err)
    return NextResponse.json({ error: 'יצירת קובץ הייצוא נכשלה' }, { status: 500 })
  }
}
