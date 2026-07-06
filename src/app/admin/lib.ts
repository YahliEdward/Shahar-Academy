// Admin-only helpers shared by the dashboard components.
import { Slot, Booking, DAYS, getWeekDates, isSlotPast } from '@/lib/types'

export const whatsappUrl = (phone: string, name: string) => {
  const num = phone.replace(/[^0-9]/g, '').replace(/^0/, '972')
  const msg = encodeURIComponent(`שלום! זה שחר, מורה פרטי למתמטיקה. קיבלתי את הבקשה עבור ${name}. אשמח לתאם את הפרטים :)`)
  return `https://wa.me/${num}?text=${msg}`
}

export const normalizePhone = (s: string) => s.replace(/\D/g, '')

export function getSlotLabel(booking: Booking, slots: Slot[]): string {
  if (booking.slotLabel) return booking.slotLabel
  const s = slots.find((sl) => sl.id === booking.slotId)
  if (!s) return booking.slotId
  return `יום ${DAYS[s.day]} ${s.time}–${s.endTime}`
}

export interface TodayInfo {
  isWeekend: boolean
  jsDay: number
  todaySlots: Slot[]
  nextSlot: Slot | null
  doneCount: number
}

// Today's lessons derived from the current week's slots. Friday/Saturday
// (getDay() > 4) have no lessons — DayIndex only covers Sunday–Thursday.
export function getTodayInfo(slots: Slot[]): TodayInfo {
  const jsDay = new Date().getDay()
  if (jsDay > 4) return { isWeekend: true, jsDay, todaySlots: [], nextSlot: null, doneCount: 0 }
  const weekDates = getWeekDates(0)
  const todaySlots = slots
    .filter((s) => s.day === jsDay && s.groupType !== 'empty')
    .sort((a, b) => a.time.localeCompare(b.time))
  const nextSlot = todaySlots.find((s) => !isSlotPast(s, weekDates)) ?? null
  const doneCount = todaySlots.filter((s) => isSlotPast(s, weekDates)).length
  return { isWeekend: false, jsDay, todaySlots, nextSlot, doneCount }
}
