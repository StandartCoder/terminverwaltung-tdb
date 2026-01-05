import { ERROR_CODES, HTTP_STATUS } from '@terminverwaltung/shared'
import type { Context, Next } from 'hono'

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  message?: string
}

const stores = new Map<string, Map<string, RateLimitEntry>>()

function getClientIp(c: Context): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'unknown'
  )
}

function cleanupExpiredEntries(store: Map<string, RateLimitEntry>): void {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key)
    }
  }
}

export function createRateLimiter(name: string, config: RateLimitConfig) {
  const { windowMs, maxRequests, message } = config

  if (!stores.has(name)) {
    stores.set(name, new Map())
  }
  const store = stores.get(name)!

  setInterval(() => cleanupExpiredEntries(store), Math.min(windowMs, 60000))

  return async function rateLimitMiddleware(c: Context, next: Next): Promise<Response | void> {
    const ip = getClientIp(c)
    const now = Date.now()

    let entry = store.get(ip)

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs }
      store.set(ip, entry)
    }

    entry.count++

    const remaining = Math.max(0, maxRequests - entry.count)
    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000)

    c.header('X-RateLimit-Limit', String(maxRequests))
    c.header('X-RateLimit-Remaining', String(remaining))
    c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)))

    if (entry.count > maxRequests) {
      c.header('Retry-After', String(resetSeconds))
      return c.json(
        {
          error: ERROR_CODES.RATE_LIMITED,
          message: message || `Zu viele Anfragen. Bitte warten Sie ${resetSeconds} Sekunden.`,
        },
        HTTP_STATUS.TOO_MANY_REQUESTS
      )
    }

    await next()
  }
}

export const loginRateLimiter = createRateLimiter('login', {
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Zu viele Anmeldeversuche. Bitte warten Sie 15 Minuten.',
})

export const bookingRateLimiter = createRateLimiter('booking', {
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Zu viele Buchungsanfragen. Bitte warten Sie eine Minute.',
})

export const codeCheckRateLimiter = createRateLimiter('codeCheck', {
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Zu viele Anfragen. Bitte warten Sie eine Minute.',
})

export const cancellationRateLimiter = createRateLimiter('cancellation', {
  windowMs: 60 * 1000,
  maxRequests: 5,
  message: 'Zu viele Stornierungsanfragen. Bitte warten Sie eine Minute.',
})
