'use client'

import { useState } from 'react'
import { Booking, Slot, dayLabel, formatShortDate, formatPrice } from '@/lib/types'
import { buildStudentAccounts, paymentsEnabled, StudentAccount, StudentLesson } from '@/lib/payments'
import { setBookingsPaid } from '@/lib/adminApi'
import { getSlotLabel, normalizePhone, paymentReminderUrl, whatsappUrl } from '../lib'
import { useToast } from './ui/Toast'
import { useConfirm } from './ui/ConfirmDialog'
import WhatsAppIcon from './WhatsAppIcon'

export type StudentsFilter = 'all' | 'owed'

// How many lessons an expanded student shows before "show all".
const LESSONS_PREVIEW = 8

function lessonLabel(l: StudentLesson): string {
  const { lessonDay, lessonTime } = l.booking
  if (lessonDay == null) return `שבוע ${formatShortDate(l.start)}`
  return `יום ${dayLabel(lessonDay)} ${formatShortDate(l.start)}${lessonTime ? ` · ${lessonTime}` : ''}`
}

function standingLabel(b: Booking, slots: Slot[]): string {
  if (b.lessonDay != null && b.lessonTime) {
    // LRI/PDI keep the RTL sentence from flipping the range to "17:00–16:00".
    return `יום ${dayLabel(b.lessonDay)} \u2066${b.lessonTime}${b.lessonEndTime ? `–${b.lessonEndTime}` : ''}\u2069`
  }
  return getSlotLabel(b, slots)
}

function LessonRow({ lesson, enabled, onToggle }: {
  lesson: StudentLesson
  enabled: boolean
  onToggle: (paid: boolean) => void
}) {
  const paid = Boolean(lesson.booking.paidAt)
  return (
    <div className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
      lesson.owed ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-200'
    }`}>
      <span className="text-slate-700" dir="rtl">{lessonLabel(lesson)}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs font-bold text-slate-900" dir="ltr">{formatPrice(lesson.price)}</span>
        {!lesson.happened ? (
          <span className="text-xs text-slate-400 min-w-[76px] text-center">בקרוב</span>
        ) : !enabled ? null : paid ? (
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

function StudentCard({ account, slots, enabled, expanded, onToggleExpand, onSetPaid }: {
  account: StudentAccount
  slots: Slot[]
  enabled: boolean
  expanded: boolean
  onToggleExpand: () => void
  onSetPaid: (ids: string[], paid: boolean) => void
}) {
  const confirmDialog = useConfirm()
  const [showAll, setShowAll] = useState(false)
  const { name, phone, parentName, grade, standing, lessons, owed, owedTotal, nextLesson } = account
  const lastLesson = lessons.find((l) => l.happened)
  const visibleLessons = showAll ? lessons : lessons.slice(0, LESSONS_PREVIEW)

  const payAll = async () => {
    if (!(await confirmDialog({
      title: 'לסמן הכל כשולם?',
      message: `${owed.length === 1 ? 'שיעור אחד' : `${owed.length} שיעורים`} של ${name} — סה״כ ${formatPrice(owedTotal)}.`,
      confirmLabel: 'סמן כשולם',
    }))) return
    onSetPaid(owed.map((l) => l.booking.id), true)
  }

  return (
    <div className={`rounded-xl border bg-white shadow-sm ${owedTotal > 0 ? 'border-red-200' : 'border-slate-200'}`}>
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
            {nextLesson
              ? `שיעור הבא: ${lessonLabel(nextLesson)}`
              : lastLesson
                ? `שיעור אחרון: ${lessonLabel(lastLesson)}`
                : 'אין שיעורים עדיין'}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {owedTotal > 0 ? (
            <span className="text-xs rounded-full px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 font-bold">
              חייב <span dir="ltr">{formatPrice(owedTotal)}</span>
            </span>
          ) : enabled && lastLesson ? (
            <span className="text-xs rounded-full px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 font-semibold">
              ✓ הכל שולם
            </span>
          ) : null}
          <span className={`text-slate-400 text-xs transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-3 border-t border-slate-200 space-y-3">
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
              {owed.length > 0 && (
                <a
                  href={paymentReminderUrl(phone, name, owed.length, formatPrice(owedTotal))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-10 px-3 inline-flex items-center gap-1.5 bg-white hover:bg-green-50 border border-green-600 rounded-lg text-xs font-semibold text-green-700 transition-colors"
                >
                  <WhatsAppIcon />
                  תזכורת תשלום
                </a>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400">אין מספר טלפון שמור</p>
          )}

          {parentName && <p className="text-xs text-slate-500">הורה: {parentName}</p>}

          {standing.length > 0 && (
            <p className="text-xs text-indigo-700">
              🔁 קבוע: {standing.map((b) => standingLabel(b, slots)).join(' · ')}
            </p>
          )}

          {owed.length > 0 && (
            <button
              onClick={payAll}
              className="w-full min-h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors"
            >
              ✓ סמן הכל כשולם · {formatPrice(owedTotal)}
            </button>
          )}

          {lessons.length > 0 ? (
            <div className="space-y-1.5">
              {visibleLessons.map((l) => (
                <LessonRow
                  key={l.booking.id}
                  lesson={l}
                  enabled={enabled}
                  onToggle={(paid) => onSetPaid([l.booking.id], paid)}
                />
              ))}
              {lessons.length > LESSONS_PREVIEW && (
                <button
                  onClick={() => setShowAll((v) => !v)}
                  className="w-full py-2 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {showAll ? 'הצג פחות' : `הצג את כל ${lessons.length} השיעורים`}
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400">אין שיעורים מאושרים עדיין</p>
          )}
        </div>
      )}
    </div>
  )
}

// Everyone with a confirmed lesson, with what they still owe. Only lessons
// that already happened count as owed; upcoming ones show as "בקרוב".
export default function StudentsTab({ bookings, slots, filter, onFilterChange, onLocalChange, onRefresh }: {
  bookings: Booking[]
  slots: Slot[]
  filter: StudentsFilter
  onFilterChange: (f: StudentsFilter) => void
  onLocalChange: (update: (list: Booking[]) => Booking[]) => void
  onRefresh: () => void
}) {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const enabled = paymentsEnabled(bookings)
  const accounts = buildStudentAccounts(bookings)
  const owing = accounts.filter((a) => a.owedTotal > 0)
  const owedTotal = owing.reduce((sum, a) => sum + a.owedTotal, 0)

  // Without the paid_at column nobody can be "owed", so the filter is moot.
  const activeFilter = enabled ? filter : 'all'
  const q = query.trim()
  const qDigits = normalizePhone(q)
  const visible = (activeFilter === 'owed' ? owing : accounts)
    .filter((a) => !q || a.name.includes(q) || (qDigits.length > 0 && normalizePhone(a.phone).includes(qDigits)))
    .sort((a, b) => activeFilter === 'owed'
      ? b.owedTotal - a.owedTotal
      : a.name.localeCompare(b.name, 'he'))

  const setPaid = async (ids: string[], paid: boolean) => {
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
    { key: 'all', label: `הכל (${accounts.length})` },
    { key: 'owed', label: `חייבים (${owing.length})` },
  ]

  return (
    <div>
      {enabled ? (
        <div className="mb-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500 font-semibold">חוב פתוח (שיעורים שכבר התקיימו)</div>
            <div className={`text-2xl font-black ${owedTotal > 0 ? 'text-red-600' : 'text-green-600'}`} dir="ltr">
              {formatPrice(owedTotal)}
            </div>
          </div>
          <div className="text-xs text-slate-500 text-left">
            {owing.length > 0 ? `${owing.length} תלמידים חייבים` : 'כולם שילמו 🎉'}
          </div>
        </div>
      ) : (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
          מעקב התשלומים עוד לא פעיל: צריך להריץ פעם אחת את העדכון של מסד הנתונים (supabase-schema.sql) ב-Supabase.
        </div>
      )}

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
          {q ? <>אין תוצאות ל&quot;{query}&quot;</> : 'אין תלמידים חייבים 🎉'}
        </p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
          {visible.map((a) => (
            <StudentCard
              key={a.name}
              account={a}
              slots={slots}
              enabled={enabled}
              expanded={expanded === a.name}
              onToggleExpand={() => setExpanded((cur) => cur === a.name ? null : a.name)}
              onSetPaid={setPaid}
            />
          ))}
        </div>
      )}
    </div>
  )
}
