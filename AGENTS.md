<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Pricing rules (project default)

These are the default lesson prices. Apply them to all code, database schemas,
and content unless a task explicitly overrides them. The canonical machine-usable
source of truth lives in `src/lib/pricing.ts` — import from there rather than
hardcoding numbers.

Prices are in whole shekels (₪) and are quoted **per student** (the amount each
student pays), except the private lesson which is a single-student total.

| Group size        | Per-student price |
| ----------------- | ----------------- |
| 1 (private)       | 180 ₪             |
| 2                 | 140 ₪             |
| 3                 | 120 ₪             |
| 4+ (standard)     | 100 ₪ (default)   |

**Availability constraint:** a small group of 1–3 students is only possible when
there is open space in the slot (e.g. a last-minute cancellation or an otherwise
unfilled slot). When the slot is at its standard capacity, the standard group
size — and therefore the standard 100 ₪ rate — applies.
