const STORAGE_KEY = 'shahar-academy:last-registration'

export interface SavedRegistration {
  studentName: string
  parentName: string
  phone: string
  grade: string
}

export function readSavedRegistration(): SavedRegistration | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      typeof parsed?.studentName !== 'string' ||
      typeof parsed?.parentName !== 'string' ||
      typeof parsed?.phone !== 'string' ||
      typeof parsed?.grade !== 'string'
    ) return null
    return parsed
  } catch {
    return null
  }
}

export function saveRegistration(data: SavedRegistration): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // storage unavailable (private browsing, quota, etc.) — ignore
  }
}

export function clearSavedRegistration(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
