// Where lessons take place. Shahar teaches from a classroom at his home, so the
// street address is kept out of the public site (and out of this public repo):
// it lives in server env vars and is only returned to someone who has just
// submitted a booking.

export interface LessonLocation {
  address: string
  mapsUrl: string
  wazeUrl: string
}

// Server-only: reads env vars that are never exposed to the browser bundle.
export function getLessonLocation(): LessonLocation | null {
  const address = process.env.LESSON_ADDRESS?.trim()
  if (!address) return null
  const q = encodeURIComponent(address)
  return {
    address,
    // Prefer the Google Business Profile link (reviews, photos, directions);
    // fall back to a plain address search.
    mapsUrl: process.env.LESSON_MAPS_URL?.trim() || `https://www.google.com/maps/search/?api=1&query=${q}`,
    wazeUrl: `https://waze.com/ul?q=${q}&navigate=yes`,
  }
}
