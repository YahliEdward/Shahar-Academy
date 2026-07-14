// ─── Pricing rules (project default configuration) ──────────────────────────
//
// Single source of truth for lesson pricing. Prices are in whole shekels (₪)
// and are quoted PER STUDENT — the amount each student pays for the lesson.
//
// The rate depends on how many students share the slot: the more students in a
// group, the lower the price each one pays. A full/standard group is the
// default rate; smaller groups pay a premium.
//
//   Group size        Per-student price
//   ─────────────────────────────────────
//   1 (private)       180 ₪
//   2                 140 ₪
//   3                 120 ₪
//   4+ (standard)     100 ₪   ← default
//
// Availability constraint: a small group (1–3 students) is only possible when
// there is open space in the slot — e.g. a last-minute cancellation or an
// otherwise-unfilled slot. When the slot is at its standard capacity, the
// standard group size (and therefore the standard 100 ₪ rate) applies.

export const CURRENCY = 'ILS' as const

// Per-student price by group size. Any size not listed (4, 5, 6 …) falls back
// to STANDARD_PRICE.
export const PRICE_BY_GROUP_SIZE: Record<number, number> = {
  1: 180, // private lesson
  2: 140,
  3: 120,
}

// The default rate: a standard (full) group. Applies to any group of 4 or more,
// and is the fallback whenever a specific size isn't listed above.
export const STANDARD_PRICE = 100

// The smallest standard group size — at or above this, everyone pays the
// standard rate. Below it, the small-group premiums above apply, but only when
// there is open space (see the availability constraint note above).
export const STANDARD_GROUP_SIZE = 4

// The per-student price for a lesson shared by `groupSize` students.
export function pricePerStudent(groupSize: number): number {
  return PRICE_BY_GROUP_SIZE[groupSize] ?? STANDARD_PRICE
}
