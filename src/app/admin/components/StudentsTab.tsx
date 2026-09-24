'use client'

import { useState } from 'react'
import { Booking, Slot, dayLabel, formatShortDate, formatPrice } from '@/lib/types'
import { monthKeyOf, monthLabel } from '@/lib/reports'
import {
  buildStudentAccounts, owedBefore, paymentsEnabled, StudentAccount, StudentLesson, StudentMonth,
} from '@/lib/payments'
import { setBookingsPaid } from '@/lib/adminApi'
import { getSlotLabel, normalizePhone, whatsappMessageUrl, whatsappUrl } from '../lib'
import { useToast } from './ui/Toast'
import { useConfirm } from './ui/ConfirmDialog'
import WhatsAppIcon from './WhatsAppIcon'

export type StudentsFilter = 'all' | 'owed'

const lessonCount = (n: number) => (n === 1 ? 'שיעור אחד' : `${n} שיעורים`)
const monthName = (monthKey: string) => monthLabel(monthKey).split(' ')[0]

function lessonLabel(l: StudentLesson, withTime = true): string {
  const { lessonDay, lessonTime } = l.booking
  if (lessonDay == null) return `שבוע ${formatShortDate(l.start)}`
  return `יום ${dayLabel(lessonDay)} ${formatShortDate(l.start)}${withTime && lessonTime ? ` · ${lessonTime}` : ''}`
}

function standingLabel(b: Booking, slots: Slot[]): string {
  if (b.lessonDay != null && b.lessonTime) {
    // LRI/PDI keep the RTL sentence from flipping the range to "17:00–16:00".
    return `יום ${dayLabel(b.lessonDay)} ⁦${b.lessonTime}${b.lessonEndTime ? `–${b.lessonEndTime}` : ''}⁩`
  }
  return getSlotLabel(b, slots)
}

// The monthly bill sent to the parent: each unpaid lesson of the month with
// its date and price, plus anything left over from earlier months.
function billText(account: StudentAccount, month: StudentMonth | undefined, earlier: number): string {
  const due = month?.lessons.filter((l) => l.owed) ?? []
  const monthOwed = month?.owed ?? 0
  const lines = ['שלום! זה שחר 🙂']
  if (month && due.length > 0) {
    lines.push(`סיכום השיעורים של ${account.name} — ${month.label}:`, '')
    for (const l of due) lines.push(`• ${lessonLabel(l, false)} — ${formatPrice(l.price)}`)
    lines.push('', `סה״כ ${month.label}: ${formatPrice(monthOwed)}`)
    if (earlier > 0) {
      lines.push(`יתרה מחודשים קודמים: ${formatPrice(earlier)}`, `סה״כ לתשלום: ${formatPrice(monthOwed + earlier)}`)
    }
  } else if (earlier > 0) {
    lines.push(`נשארה יתרה על השיעורים של ${account.name}: ${formatPrice(earlier)}`)
  }
  lines.push('', 'תודה רבה!')
  return lines.join('\n')
}

function LessonRow({ lesson, enabled, onToggle }: {
  lesson: StudentLesson
  enabled: boolean
  onToggle: (paid: boolean) => void
}) {
  return (
    <div className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
      lesson.owed ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-200'
    }`}>
      <span className="text-slate-700">{lessonLabel(lesson)}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs font-bold text-slate-900" dir="ltr">{formatPrice(lesson.price)}</span>
        {!lesson.happened ? (
          <span className="text-xs text-slate-400 min-w-[76px] text-center">בקרוב</span>
        ) : !enabled ? null : lesson.paid ? (
          <button
            onClick={() => onToggle(false)}
            title="לחצו כדי לסמן כלא שולם"
            className="min-h-9 min-w-[76px] px-2 rounded-lg text-xs font-bold bg-green-50 text-green-700 border border-green-300 hover:bg-green-100 transition-colors"
          >
            ✓ שולם
          </button>
        ) : (
          <button
            onClick={() => onToggle(true)}
            className="min-h-9 min-w-[76px] px-2 rounded-lg text-xs font-bold bg-white text-red-600 border border-red-300 hover:bg-red-50 transition-colors"
          >
            סמן כשולם
          </button>
        )}
      </div>
    </div>
  )
}

function StudentCard({ account, month, monthKey, slots, enabled, expanded, onToggleExpand, onSetPaid, onSelectMonth }: {
  account: StudentAccount
  // The selected month's lessons, if the student had any.
  month: StudentMonth | undefined
  monthKey: string
  slots: Slot[]
  enabled: boolean
  expanded: boolean
  onToggleExpand: () => void
  onSetPaid: (ids: string[], paid: boolean) => void
  onSelectMonth: (monthKey: string) => void
}) {
  const toast = useToast()
  const confirmDialog = useConfirm()
  const { name, phone, parentName, grade, standing, months, owedTotal, nextLesson, lastLesson } = account
  const earlier = owedBefore(account, monthKey)
  const earlierMonths = months.filter((m) => m.monthKey < monthKey && m.owed > 0)
  const hasDue = (month?.owed ?? 0) + earlier > 0
  const happenedThisMonth = month?.lessons.some((l) => l.happened) ?? false

  const markPaid = async (lessons: StudentLesson[], title: string) => {
    const due = lessons.filter((l) => l.owed)
    if (!(await confirmDialog({
      title,
      message: `${lessonCount(due.length)} של ${name} — סה״כ ${formatPrice(due.reduce((s, l) => s + l.price, 0))}.`,
      confirmLabel: 'סמן כשולם',
    }))) return
    onSetPaid(due.map((l) => l.booking.id), true)
  }

  const copyBill = async () => {
    try {
      await navigator.clipboard.writeText(billText(account, month, earlier))
      toast('החשבון הועתק ✓')
    } catch {
      toast('ההעתקה נכשלה', 'error')
    }
  }

  return (
    <div className={`rounded-xl border bg-white shadow-sm ${hasDue ? 'border-red-200' : 'border-slate-200'}`}>
      <button
        onClick={onToggleExpand}
        aria-expanded={expanded}
        className="w-full p-4 flex items-start justify-between gap-3 text-right hover:bg-slate-50 rounded-xl transition-colors"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900">{name}</span>
            {grade && <span className="text-xs text-slate-400">{grade}</span>}
            {standing.length > 0 && (
              <span className="text-[10px] rounded-full px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200">🔁 קבוע</span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {month
              ? `${lessonCount(month.lessons.length)} ב${monthName(monthKey)} · ${formatPrice(month.total)}`
              : `אין שיעורים ב${monthName(monthKey)}`}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex flex-col items-end gap-1">
            {month && month.owed > 0 ? (
              <span className="text-xs rounded-full px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 font-bold">
                לגבות {formatPrice(month.owed)}
              </span>
            ) : month && enabled && happenedThisMonth ? (
              <span className="text-xs rounded-full px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 font-semibold">
                ✓ שולם
              </span>
            ) : month ? (
              <span className="text-xs rounded-full px-2.5 py-1 bg-slate-50 text-slate-500 border border-slate-200">בקרוב</span>
            ) : null}
            {earlier > 0 && (
              <span className="text-[10px] rounded-full px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                + חוב קודם {formatPrice(earlier)}
              </span>
            )}
          </div>
          <span className={`text-slate-400 text-xs transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-3 border-t border-slate-200 space-y-4">
          {/* Contact + billing */}
          <div className="space-y-2">
            {phone ? (
              <div className="flex gap-2 flex-wrap">
                <a
                  href={`tel:${phone}`}
                  className="min-h-10 px-3 inline-flex items-center bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
                  dir="ltr"
                >
                  📞 {phone}
                </a>
                <a
                  href={whatsappUrl(phone, name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-10 px-3 inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-xs font-semibold text-white transition-colors"
                >
                  <WhatsAppIcon />
                  וואטסאפ
                </a>
              </div>
            ) : (
              <p className="text-xs text-slate-400">אין מספר טלפון שמור</p>
            )}
            {enabled && hasDue && (
              <div className="flex gap-2 flex-wrap">
                {phone && (
                  <a
                    href={whatsappMessageUrl(phone, billText(account, month, earlier))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-10 px-3 inline-flex items-center gap-1.5 bg-white hover:bg-green-50 border border-green-600 rounded-lg text-xs font-bold text-green-700 transition-colors"
                  >
                    <WhatsAppIcon />
                    שלח חשבון בוואטסאפ
                  </a>
                )}
                <button
                  onClick={copyBill}
                  className="min-h-10 px-3 inline-flex items-center bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
                >
                  📋 העתק חשבון
                </button>
              </div>
            )}
            {parentName && <p className="text-xs text-slate-500">הורה: {parentName}</p>}
            {standing.length > 0 && (
              <p className="text-xs text-indigo-700">
                🔁 קבוע: {standing.map((b) => standingLabel(b, slots)).join(' · ')}
              </p>
            )}
            <p className="text-xs text-slate-500">
              {nextLesson
                ? `שיעור הבא: ${lessonLabel(nextLesson)}`
                : lastLesson
                  ? `שיעור אחרון: ${lessonLabel(lastLesson)}`
                  : 'אין שיעורים עדיין'}
            </p>
          </div>

          {/* Selected month */}
          {month && (
            <section className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-700">שיעורים ב{month.label}</h4>
              {month.lessons.map((l) => (
                <LessonRow
                  key={l.booking.id}
                  lesson={l}
                  enabled={enabled}
                  onToggle={(paid) => onSetPaid([l.booking.id], paid)}
                />
              ))}
              <div className="flex justify-between gap-2 flex-wrap text-xs text-slate-500 px-1 pt-1">
                <span>סה״כ: <b className="text-slate-900">{formatPrice(month.total)}</b></span>
                {enabled && <span>שולם: <b className="text-green-700">{formatPrice(month.paid)}</b></span>}
                {enabled && <span>לגבות: <b className={month.owed > 0 ? 'text-red-600' : 'text-slate-900'}>{formatPrice(month.owed)}</b></span>}
              </div>
              {enabled && month.owed > 0 && (
                <button
                  onClick={() => markPaid(month.lessons, `לסמן את ${month.label} כשולם?`)}
                  className="w-full min-h-10 px-4 mt-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors"
                >
                  ✓ סמן את {monthName(monthKey)} כשולם · {formatPrice(month.owed)}
                </button>
              )}
            </section>
          )}

          {/* Leftover debt from earlier months */}
          {enabled && earlierMonths.length > 0 && (
            <section className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2">
              <h4 className="text-xs font-bold text-amber-900">חוב מחודשים קודמים</h4>
              {earlierMonths.map((m) => (
                <button
                  key={m.monthKey}
                  onClick={() => onSelectMonth(m.monthKey)}
                  className="w-full flex justify-between items-center text-xs text-amber-900 hover:underline"
                >
                  <span>{m.label} · {lessonCount(m.lessons.filter((l) => l.owed).length)}</span>
                  <b>{formatPrice(m.owed)} ←</b>
                </button>
              ))}
              <button
                onClick={() => markPaid(months.flatMap((m) => m.lessons), 'לסמן את כל החוב כשולם?')}
                className="w-full min-h-10 px-4 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold rounded-lg text-xs transition-colors"
              >
                ✓ סמן את כל החוב כשולם · {formatPrice(owedTotal)}
              </button>
            </section>
          )}

          {/* Month-by-month history */}
          {months.length > 1 && (
            <section>
              <h4 className="text-xs font-bold text-slate-700 mb-1.5">כל החודשים</h4>
              <div className="rounded-lg border border-slate-200 divide-y divide-slate-200 overflow-hidden">
                {months.map((m) => (
                  <button
                    key={m.monthKey}
                    onClick={() => onSelectMonth(m.monthKey)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs transition-colors ${
                      m.monthKey === monthKey ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-slate-700 font-semibold">{m.label}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-slate-500">{lessonCount(m.lessons.length)} · {formatPrice(m.total)}</span>
                      {!enabled ? null : m.owed > 0 ? (
                        <span className="text-red-600 font-bold">לגבות {formatPrice(m.owed)}</span>
                      ) : m.lessons.some((l) => l.happened) ? (
                        <span className="text-green-700 font-bold">✓ שולם</span>
                      ) : (
                        <span className="text-slate-400">בקרוב</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function MonthStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="text-center">
      <div className={`text-lg sm:text-xl font-black ${tone}`}>{formatPrice(value)}</div>
      <div className="text-[11px] text-slate-500 font-semibold">{label}</div>
    </div>
  )
}

// Monthly billing: pick a month, see what every student owes for it (lesson by
// lesson, with dates), send the bill, and mark it paid. Only lessons that
// already happened are billed; upcoming ones show as "בקרוב".
export default function StudentsTab({ bookings, slots, filter, onFilterChange, onLocalChange, onRefresh }: {
  bookings: Booking[]
  slots: Slot[]
  filter: StudentsFilter
  onFilterChange: (f: StudentsFilter) => void
  onLocalChange: (update: (list: Booking[]) => Booking[]) => void
  onRefresh: () => void
}) {
  const toast = useToast()
  const now = new Date()
  const currentMonth = monthKeyOf(now)
  const [monthKey, setMonthKey] = useState(currentMonth)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const enabled = paymentsEnabled(bookings)
  const accounts = buildStudentAccounts(bookings, now)
  const monthOf = (a: StudentAccount) => a.months.find((m) => m.monthKey === monthKey)

  // Every month anyone had a lesson in, plus the current one, oldest first.
  const allMonths = [...new Set([currentMonth, ...accounts.flatMap((a) => a.months.map((m) => m.monthKey))])].sort()
  const monthIndex = allMonths.indexOf(monthKey)

  const monthRows = accounts.map(monthOf).filter((m): m is StudentMonth => Boolean(m))
  const totals = {
    total: monthRows.reduce((s, m) => s + m.total, 0),
    paid: monthRows.reduce((s, m) => s + m.paid, 0),
    owed: monthRows.reduce((s, m) => s + m.owed, 0),
    upcoming: monthRows.reduce((s, m) => s + m.upcoming, 0),
  }
  const earlierTotal = accounts.reduce((s, a) => s + owedBefore(a, monthKey), 0)

  // Students with lessons this month, plus anyone still owing from before it.
  const inMonth = accounts.filter((a) => monthOf(a) || owedBefore(a, monthKey) > 0)
  const dueFor = (a: StudentAccount) => (monthOf(a)?.owed ?? 0) + owedBefore(a, monthKey)
  const owing = inMonth.filter((a) => dueFor(a) > 0)

  // Without the paid_at column nobody can be "owed", so the filter is moot.
  const activeFilter = enabled ? filter : 'all'
  const q = query.trim()
  const qDigits = normalizePhone(q)
  const visible = (activeFilter === 'owed' ? owing : inMonth)
    .filter((a) => !q || a.name.includes(q) || (qDigits.length > 0 && normalizePhone(a.phone).includes(qDigits)))
    .sort((a, b) => activeFilter === 'owed'
      ? dueFor(b) - dueFor(a)
      : a.name.localeCompare(b.name, 'he'))

  const setPaid = async (ids: string[], paid: boolean) => {
    if (ids.length === 0) return
    const paidAt = paid ? new Date().toISOString() : null
    onLocalChange((list) => list.map((b) => ids.includes(b.id) ? { ...b, paidAt } : b))
    toast(paid ? 'סומן כשולם ✓' : 'סומן כלא שולם')
    try {
      await setBookingsPaid(ids, paid)
    } catch (err) {
      toast(err instanceof Error && err.message !== 'Request failed' ? err.message : 'שגיאה בשמירה — נסו שוב', 'error')
      onRefresh()
    }
  }

  if (accounts.length === 0) {
    return <p className="text-center text-slate-400 py-10">אין תלמידים מאושרים עדיין</p>
  }

  const chips: { key: StudentsFilter; label: string }[] = [
    { key: 'all', label: `הכל (${inMonth.length})` },
    { key: 'owed', label: `לא שילמו (${owing.length})` },
  ]

  return (
    <div>
      {!enabled && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
          מעקב התשלומים עוד לא פעיל: צריך להריץ פעם אחת את העדכון של מסד הנתונים (supabase-schema.sql) ב-Supabase.
        </div>
      )}

      {/* Month picker + the month's billing summary */}
      <div className="mb-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMonthKey(allMonths[monthIndex - 1])}
            disabled={monthIndex <= 0}
            aria-label="החודש הקודם"
            className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold flex items-center justify-center"
          >
            →
          </button>
          <div className="flex-1 text-center">
            <div className="font-black text-slate-900">{monthLabel(monthKey)}</div>
            {monthKey !== currentMonth && (
              <button onClick={() => setMonthKey(currentMonth)} className="text-[11px] text-blue-600 hover:underline">
                חזרה לחודש הנוכחי
              </button>
            )}
          </div>
          <button
            onClick={() => setMonthKey(allMonths[monthIndex + 1])}
            disabled={monthIndex >= allMonths.length - 1}
            aria-label="החודש הבא"
            className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold flex items-center justify-center"
          >
            ←
          </button>
        </div>

        <div className={`mt-4 grid gap-2 ${enabled ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {enabled && <MonthStat label="נשאר לגבות" value={totals.owed} tone={totals.owed > 0 ? 'text-red-600' : 'text-slate-900'} />}
          {enabled && <MonthStat label="שולם" value={totals.paid} tone="text-green-600" />}
          <MonthStat label="סה״כ החודש" value={totals.total} tone="text-slate-900" />
        </div>
        {(totals.upcoming > 0 || (enabled && earlierTotal > 0)) && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-[11px] text-center">
            {totals.upcoming > 0 && (
              <p className="text-slate-400">עוד {formatPrice(totals.upcoming)} בשיעורים שעוד לא התקיימו החודש</p>
            )}
            {enabled && earlierTotal > 0 && (
              <p className="text-amber-700 font-semibold">+ {formatPrice(earlierTotal)} חוב מחודשים קודמים</p>
            )}
          </div>
        )}
      </div>

      <div className="mb-4 space-y-3">
        <input
          type="text"
          inputMode="search"
          placeholder="חיפוש לפי שם או טלפון…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors placeholder:text-slate-400"
        />
        {enabled && (
          <div className="flex gap-2">
            {chips.map((c) => (
              <button
                key={c.key}
                onClick={() => onFilterChange(c.key)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeFilter === c.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="text-center text-slate-400 py-10 text-sm">
          {q
            ? <>אין תוצאות ל&quot;{query}&quot;</>
            : activeFilter === 'owed'
              ? 'כולם שילמו 🎉'
              : `אין שיעורים ב${monthName(monthKey)}`}
        </p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
          {visible.map((a) => (
            <StudentCard
              key={a.name}
              account={a}
              month={monthOf(a)}
              monthKey={monthKey}
              slots={slots}
              enabled={enabled}
              expanded={expanded === a.name}
              onToggleExpand={() => setExpanded((cur) => cur === a.name ? null : a.name)}
              onSetPaid={setPaid}
              onSelectMonth={setMonthKey}
            />
          ))}
        </div>
      )}
    </div>
  )
}
