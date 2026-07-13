'use client'

import { Slot, Booking, GroupType, GROUP_LABELS, GROUP_COLORS, MAX_STUDENTS } from '@/lib/types'
import TimePicker from '@/components/TimePicker'

const GROUP_OPTIONS: GroupType[] = ['middle-school', 'high-4', 'high-5', 'mixed', 'empty']

export default function SlotEditorCard({ slot, students, showStudents, canRemove, showAdjustButtons = true, onTimeChange, onGroupChange, onAdjustEnrolled, onRemove, onShowStudents }: {
  slot: Slot
  students: Booking[]
  showStudents: boolean
  canRemove: boolean
  showAdjustButtons?: boolean
  onTimeChange: (field: 'time' | 'endTime', value: string) => void
  onGroupChange: (g: GroupType) => void
  onAdjustEnrolled: (delta: number) => void
  onRemove: () => void
  onShowStudents: () => void
}) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${GROUP_COLORS[slot.groupType]}`}>
      {showStudents && (
        <div
          role="button"
          tabIndex={0}
          onClick={onShowStudents}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onShowStudents() }}
          className="mb-3 pb-3 border-b border-slate-900/10 cursor-pointer rounded-lg -mx-1 px-1 hover:bg-slate-900/5 transition-colors"
        >
          {students.length > 0 ? (
            <>
              <p className="text-xs text-slate-500 mb-1.5">תלמידים רשומים (לחצו לפרטים):</p>
              <div className="flex flex-wrap gap-1">
                {students.map((b) => (
                  <span
                    key={b.id}
                    className={`text-xs rounded px-2 py-0.5 ${b.status === 'confirmed' ? 'bg-green-50 text-green-700 border border-green-300' : 'bg-white text-slate-600 border border-slate-300'}`}
                  >
                    {b.studentName}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400">אין תלמידים עדיין — לחצו להוספה</p>
          )}
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Time inputs */}
        <div className="flex items-center gap-2 text-sm" style={{ direction: 'ltr' }}>
          <TimePicker value={slot.time} onChange={(v) => onTimeChange('time', v)} />
          <span className="text-slate-400">–</span>
          <TimePicker value={slot.endTime} onChange={(v) => onTimeChange('endTime', v)} />
        </div>

        <select
          value={slot.groupType}
          onChange={(e) => onGroupChange(e.target.value as GroupType)}
          className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 text-sm outline-none focus:border-blue-500 transition-colors"
        >
          {GROUP_OPTIONS.map((g) => (
            <option key={g} value={g}>{GROUP_LABELS[g]}</option>
          ))}
        </select>

        <div className="flex items-center gap-3">
          {showAdjustButtons && (
            <button
              onClick={() => onAdjustEnrolled(-1)}
              disabled={slot.enrolled <= 0}
              className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-30 text-slate-700 font-bold transition-colors text-lg"
            >
              −
            </button>
          )}
          <div className="text-center min-w-[70px]">
            <div className="text-slate-900 font-black text-lg">{slot.enrolled}/{MAX_STUDENTS}</div>
            <div className="flex gap-0.5 mt-1">
              {Array.from({ length: MAX_STUDENTS }).map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full ${i < slot.enrolled ? 'bg-blue-500' : 'bg-slate-300'}`} />
              ))}
            </div>
          </div>
          {showAdjustButtons && (
            <button
              onClick={() => onAdjustEnrolled(1)}
              disabled={slot.enrolled >= MAX_STUDENTS}
              className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white font-bold transition-colors text-lg"
            >
              +
            </button>
          )}

          {canRemove && (
            <button
              onClick={onRemove}
              title="הסר שעה"
              className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold transition-colors text-sm border border-red-200"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
