// Ids of the bookings made from this browser, so the schedule page can show
// "your upcoming lessons". Lives only on this device, like lastRegistration.
const STORAGE_KEY = 'shahar-academy:my-bookings'

// Newest kept first; older ids fall off (the API also caps a lookup at 20).
const MAX_KEPT = 20

export function readMyBookingIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

function write(ids: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_KEPT)))
  } catch {
    // storage unavailable (private browsing, quota, etc.) — ignore
  }
}

export function addMyBookingId(id: string): void {
  if (typeof window === 'undefined') return
  write([id, ...readMyBookingIds().filter((x) => x !== id)])
}

// Drops ids that are no longer worth asking about (cancelled or finished).
export function keepOnlyMyBookingIds(keep: Set<string>): void {
  if (typeof window === 'undefined') return
  write(readMyBookingIds().filter((id) => keep.has(id)))
}
