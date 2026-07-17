import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { isAdminConfigured } from '@/lib/supabaseAdmin'
import { getReportExportById } from '@/lib/serverDb'

// Re-downloads one past export exactly as it was generated — never a
// recompute — even if the underlying bookings have since changed.
export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdminConfigured) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  }
  const { id } = await ctx.params
  try {
    const record = await getReportExportById(id)
    if (!record) return NextResponse.json({ error: 'הקובץ לא נמצא' }, { status: 404 })
    const buffer = Buffer.from(record.fileBase64, 'base64')
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(record.filename)}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'הורדת הקובץ נכשלה' }, { status: 500 })
  }
}
