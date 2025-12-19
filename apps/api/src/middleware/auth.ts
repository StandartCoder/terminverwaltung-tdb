import { verifyAccessToken, type JwtPayload } from '@terminverwaltung/auth'
import { ERROR_CODES, HTTP_STATUS } from '@terminverwaltung/shared'
import type { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'

declare module 'hono' {
  interface ContextVariableMap {
    user: JwtPayload
  }
}

function extractToken(c: Context): string | null {
  const authHeader = c.req.header('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  const cookieToken = getCookie(c, 'access_token')
  if (cookieToken) {
    return cookieToken
  }

  return null
}

export async function requireAuth(c: Context, next: Next): Promise<Response | void> {
  const token = extractToken(c)

  if (!token) {
    return c.json(
      { error: ERROR_CODES.UNAUTHORIZED, message: 'Authentifizierung erforderlich' },
      HTTP_STATUS.UNAUTHORIZED
    )
  }

  try {
    const payload = verifyAccessToken(token)
    c.set('user', payload)
    await next()
  } catch {
    return c.json(
      { error: ERROR_CODES.UNAUTHORIZED, message: 'Ungültiger oder abgelaufener Token' },
      HTTP_STATUS.UNAUTHORIZED
    )
  }
}

export async function requireAdmin(c: Context, next: Next): Promise<Response | void> {
  const token = extractToken(c)

  if (!token) {
    return c.json(
      { error: ERROR_CODES.UNAUTHORIZED, message: 'Authentifizierung erforderlich' },
      HTTP_STATUS.UNAUTHORIZED
    )
  }

  try {
    const payload = verifyAccessToken(token)

    if (!payload.isAdmin) {
      return c.json(
        { error: ERROR_CODES.FORBIDDEN, message: 'Administratorrechte erforderlich' },
        HTTP_STATUS.FORBIDDEN
      )
    }

    c.set('user', payload)
    await next()
  } catch {
    return c.json(
      { error: ERROR_CODES.UNAUTHORIZED, message: 'Ungültiger oder abgelaufener Token' },
      HTTP_STATUS.UNAUTHORIZED
    )
  }
}

export async function optionalAuth(c: Context, next: Next): Promise<void> {
  const token = extractToken(c)

  if (token) {
    try {
      const payload = verifyAccessToken(token)
      c.set('user', payload)
    } catch {
      // Token invalid, but optional auth so continue without user
    }
  }

  await next()
}

export async function requireSelfOrAdmin(c: Context, next: Next): Promise<Response | void> {
  const token = extractToken(c)

  if (!token) {
    return c.json(
      { error: ERROR_CODES.UNAUTHORIZED, message: 'Authentifizierung erforderlich' },
      HTTP_STATUS.UNAUTHORIZED
    )
  }

  try {
    const payload = verifyAccessToken(token)
    const targetId = c.req.param('id')

    if (!payload.isAdmin && payload.sub !== targetId) {
      return c.json(
        { error: ERROR_CODES.FORBIDDEN, message: 'Keine Berechtigung für diese Aktion' },
        HTTP_STATUS.FORBIDDEN
      )
    }

    c.set('user', payload)
    await next()
  } catch {
    return c.json(
      { error: ERROR_CODES.UNAUTHORIZED, message: 'Ungültiger oder abgelaufener Token' },
      HTTP_STATUS.UNAUTHORIZED
    )
  }
}
