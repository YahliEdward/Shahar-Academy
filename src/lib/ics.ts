// Minimal RFC 5545 builder for the "add to calendar" button on the booking
// success screen. Events use floating local times (no TZID): every user is in
// Israel, and a bare TZID without a full VTIMEZONE block is invalid, so plain
// wall-clock time is the smallest correct encoding.

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// Local date + "HH:MM" → YYYYMMDDTHHMMSS. Deliberately NOT toISOString():
// UTC conversion can shift the date (same pitfall getWeekKey documents).
function localStamp(date: Date, time: string): string {
  const [h, m] = time.split(':').map(Number)
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(h || 0)}${pad(m || 0)}00`
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

export function buildLessonIcs(opts: {
  date: Date
  time: string
  endTime: string
  studentName: string
}): string {
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Shahar Academy//Booking//HE',
    'BEGIN:VEVENT',
    `UID:${crypto.randomUUID()}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${localStamp(opts.date, opts.time)}`,
    `DTEND:${localStamp(opts.date, opts.endTime)}`,
    `SUMMARY:${escapeText('שיעור מתמטיקה — האקדמיה של שחר')}`,
    `DESCRIPTION:${escapeText(`תלמיד: ${opts.studentName}\nההרשמה ממתינה לאישור סופי של שחר`)}`,
    'STATUS:TENTATIVE',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n') + '\r\n'
}

// Blob + <a download> works everywhere that matters here; iOS Safari opens a
// preview/share sheet with "Open in Calendar", which is the desired flow.
export function downloadIcs(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
