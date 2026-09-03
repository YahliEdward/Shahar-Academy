import { NextRequest } from 'next/server'

// Best-effort abuse throttling for the public write endpoints (booking
// requests, review submissions). Counters live in module scope, so they are
// per serverless instance rather than global — enough to blunt a naive flood
// without adding infrastructure, in the same spirit as the failed-login
// throttle in /api/admin/login. Limits are deliberately loose: a real family
// booking two or three siblings must never be turned away.

export function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

export interface RateLimiter {
  // true = allowed, false = over the limit for this IP's current window.
  allow: (request: NextRequest) => boolean
}

export function createRateLimiter({ windowMs, max }: { windowMs: number; max: number }): RateLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>()

  return {
    allow(request: NextRequest): boolean {
      const ip = clientIp(request)
      const now = Date.now()
      const entry = hits.get(ip)

      if (!entry || entry.resetAt <= now) {
        // Sweep expired entries occasionally so a long-lived instance can't
        // accumulate one map entry per IP it has ever seen.
        if (hits.size > 1000) {
          for (const [key, value] of hits) {
            if (value.resetAt <= now) hits.delete(key)
          }
        }
        hits.set(ip, { count: 1, resetAt: now + windowMs })
        return true
      }

      if (entry.count >= max) return false
      entry.count += 1
      return true
    },
  }
}
