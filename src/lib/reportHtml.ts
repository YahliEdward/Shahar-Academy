// Builds a standalone, print-ready HTML document of the revenue report.
//
// Why HTML-and-print rather than a server-generated PDF: PDF draws glyphs
// left-to-right, so a server-side build would have to re-implement the
// bidirectional text algorithm by hand. Labels here mix Hebrew with Latin
// digits ("יום ראשון 18:00–19:00", "אוגוסט 2026"), which naive reversal
// mangles. The browser already has a correct bidi engine, so rendering there
// and printing to PDF is both simpler and more trustworthy.
//
// Derived from buildReport/buildDetailRows — the same functions behind the
// on-screen report and the .xlsx export — so the three can never disagree.
import { Booking } from './types'
import { buildReport, buildDetailRows, formatPrice } from './reports'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Israel-local "14 בספטמבר 2026, 13:20" for the report header.
function generatedAt(): string {
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem', dateStyle: 'long', timeStyle: 'short',
  }).format(new Date())
}

function table(headers: string[], rows: string[][]): string {
  const head = headers.map((h) => `<th>${esc(h)}</th>`).join('')
  const body = rows
    .map((r) => `<tr>${r.map((c, i) =>
      // Last column is always the money/number column — keep it LTR so
      // "1,800 ₪" doesn't get reordered inside the RTL table.
      i === r.length - 1
        ? `<td class="num">${esc(c)}</td>`
        : `<td>${esc(c)}</td>`
    ).join('')}</tr>`)
    .join('')
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

export function buildReportHtml(bookings: Booking[], slotLabels?: Map<string, string>): string {
  const { byMonth, byWeek, byStudent, grandTotal } = buildReport(bookings)
  const detail = buildDetailRows(bookings, slotLabels)

  const sections = [
    byMonth.length
      ? `<section><h2>לפי חודש</h2>${table(
          ['חודש', 'סה״כ'],
          byMonth.map((m) => [m.label, formatPrice(m.total)]),
        )}</section>`
      : '',
    byWeek.length
      ? `<section><h2>לפי שבוע</h2>${table(
          ['שבוע', 'שנה', 'סה״כ'],
          byWeek.map((w) => [w.label, String(w.year), formatPrice(w.total)]),
        )}</section>`
      : '',
    byStudent.length
      ? `<section><h2>לפי תלמיד</h2>${table(
          ['תלמיד', 'שיעורים', 'סה״כ'],
          byStudent.map((s) => [s.studentName, String(s.lessonCount), formatPrice(s.total)]),
        )}</section>`
      : '',
    detail.length
      ? `<section class="break"><h2>פירוט שיעורים</h2>${table(
          ['תלמיד', 'חודש', 'שבוע', 'משבצת', 'מחיר'],
          detail.map((d) => [d.studentName, d.monthLabel, d.weekLabel, d.slotLabel, formatPrice(d.price)]),
        )}</section>`
      : '',
  ].join('\n')

  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>דוח הכנסות — שחר</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  /* Heebo matches the site, but the fallbacks are all Hebrew-capable so the
     report is never at the mercy of the font CDN — especially on a phone
     printing offline. */
  :root { --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --brand:#2563eb; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Heebo', 'Arial Hebrew', 'Noto Sans Hebrew', Arial, sans-serif;
    color: var(--ink); background:#f8fafc; margin:0; padding:24px;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .sheet { max-width: 820px; margin:0 auto; background:#fff; padding:32px;
           border:1px solid var(--line); border-radius:12px; }
  header { border-bottom:3px solid var(--brand); padding-bottom:16px; margin-bottom:24px; }
  h1 { margin:0; font-size:24px; font-weight:900; }
  .sub { color:var(--muted); font-size:13px; margin-top:4px; }
  .total { text-align:center; background:#eff6ff; border:1px solid #bfdbfe;
           border-radius:10px; padding:18px; margin-bottom:28px; }
  .total .v { font-size:32px; font-weight:900; color:var(--brand); direction:ltr; }
  .total .l { font-size:12px; color:var(--muted); font-weight:700; margin-top:2px; }
  h2 { font-size:15px; font-weight:700; margin:0 0 10px; }
  /* Cells never wrap, so a time range can't split into "15:00–" / "16:00".
     On a narrow screen the table scrolls sideways instead of squeezing; in
     print it has the full A4 width and fits without either. */
  section { margin-bottom:26px; overflow-x:auto; }
  table { width:100%; border-collapse:collapse; font-size:12.5px; }
  th, td { text-align:right; padding:7px 10px; border-bottom:1px solid var(--line);
           white-space:nowrap; }
  th { background:#f1f5f9; font-weight:700; font-size:11.5px; color:#334155; }
  td.num, th:last-child { text-align:left; direction:ltr; font-variant-numeric:tabular-nums; }
  tbody tr:nth-child(even) { background:#fafafa; }
  /* Sticky so the save button stays reachable down a long report — needs its
     own opaque backdrop or the rows scroll visibly underneath it. */
  .bar { position:sticky; top:0; z-index:10; text-align:center;
         background:#f8fafc; border-bottom:1px solid var(--line);
         margin:-24px -24px 20px; padding:14px 24px; }
  .bar button {
    font:inherit; font-weight:700; font-size:14px; cursor:pointer;
    background:var(--brand); color:#fff; border:0; border-radius:8px; padding:11px 22px;
  }
  .bar p { color:var(--muted); font-size:12px; margin:8px 0 0; }

  @page { size: A4; margin: 14mm; }
  @media print {
    body { background:#fff; padding:0; }
    .sheet { border:0; border-radius:0; padding:0; max-width:none; }
    .bar { display:none; }
    /* Repeat headers on every page and never split a row across pages. */
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
    section { break-inside: auto; overflow: visible; }
    .break { break-before: page; }
  }
</style>
</head>
<body>
<div class="bar">
  <button onclick="window.print()">📄 שמירה כ-PDF / הדפסה</button>
  <p>בחלון שנפתח בחרו יעד "שמירה כ-PDF"</p>
</div>
<div class="sheet">
  <header>
    <h1>דוח הכנסות — שחר</h1>
    <div class="sub">הופק ב-${esc(generatedAt())} · מבוסס על שיעורים מאושרים בלבד</div>
  </header>
  <div class="total">
    <div class="v">${esc(formatPrice(grandTotal))}</div>
    <div class="l">סה״כ הכנסה</div>
  </div>
  ${sections}
</div>
<script>
  // Give webfonts a chance to land so the print preview isn't laid out with
  // the fallback and then reflowed. Never block printing on it.
  (document.fonts ? document.fonts.ready : Promise.resolve())
    .catch(function () {})
    .then(function () { setTimeout(function () { window.print() }, 250) })
</script>
</body>
</html>`
}
