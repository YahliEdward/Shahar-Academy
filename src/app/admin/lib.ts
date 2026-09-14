// Admin-only helpers shared by the dashboard components.
import { Slot, Booking, dayLabel, getWeekDates, isSlotPast } from '@/lib/types'

export const whatsappUrl = (phone: string, name: string) => {
  const num = phone.replace(/[^0-9]/g, '').replace(/^0/, '972')
  const msg = encodeURIComponent(`שלום! זה שחר, מורה פרטי למתמטיקה. קיבלתי את הבקשה עבור ${name}. אשמח לתאם את הפרטים :)`)
  return `https://wa.me/${num}?text=${msg}`
}

export const normalizePhone = (s: string) => s.replace(/\D/g, '')

export interface StudentSuggestion {
  studentName: string
  parentName: string
  phone: string
  grade: string
  groupPreference: string
}

const normalizeName = (s: string) => s.trim().replace(/\s+/g, ' ')

// The roster of students the admin has registered before, for the quick-pick
// list in the "add student" form. There is no students table — a student is
// just a name on bookings — so it's derived from the bookings already loaded
// by the dashboard, deduped by name with the most recent record winning.
export function knownStudents(bookings: Booking[]): StudentSuggestion[] {
  const byName = new Map<string, { at: number; student: StudentSuggestion }>()
  for (const b of bookings) {
    const studentName = normalizeName(b.studentName)
    if (!studentName) continue
    const at = new Date(b.createdAt).getTime()
    const existing = byName.get(studentName)
    if (existing && existing.at >= at) continue
    byName.set(studentName, {
      at: Number.isNaN(at) ? 0 : at,
      student: {
        studentName,
        parentName: b.parentName ?? '',
        phone: b.phone ?? '',
        grade: b.grade ?? '',
        groupPreference: b.groupPreference ?? '',
      },
    })
  }
  return [...byName.values()]
    .map((e) => e.student)
    .sort((a, b) => a.studentName.localeCompare(b.studentName, 'he'))
}

export function getSlotLabel(booking: Booking, slots: Slot[]): string {
  if (booking.slotLabel) return booking.slotLabel
  const s = slots.find((sl) => sl.id === booking.slotId)
  if (!s) return booking.slotId
  return `יום ${dayLabel(s.day)} ${s.time}–${s.endTime}`
}

export interface TodayInfo {
  jsDay: number
  todaySlots: Slot[]
  nextSlot: Slot | null
  doneCount: number
}

// Today's lessons derived from the current week's slots. Motzash (day 6) only
// has lessons when the admin has added slots for it that week.
export function getTodayInfo(slots: Slot[]): TodayInfo {
  const jsDay = new Date().getDay()
  const weekDates = getWeekDates(0)
  const todaySlots = slots
    .filter((s) => s.day === jsDay && s.groupType !== 'empty')
    .sort((a, b) => a.time.localeCompare(b.time))
  const nextSlot = todaySlots.find((s) => !isSlotPast(s, weekDates)) ?? null
  const doneCount = todaySlots.filter((s) => isSlotPast(s, weekDates)).length
  return { jsDay, todaySlots, nextSlot, doneCount }
}
