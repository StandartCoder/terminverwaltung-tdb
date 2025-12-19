import { zValidator } from '@hono/zod-validator'
import {
  hashPassword,
  verifyPassword,
  generateTokenPair,
  verifyRefreshToken,
} from '@terminverwaltung/auth'
import { db } from '@terminverwaltung/database'
import { HTTP_STATUS, ERROR_CODES } from '@terminverwaltung/shared'
import {
  teacherLoginSchema,
  createTeacherSchema,
  updateTeacherSchema,
  idSchema,
} from '@terminverwaltung/validators'
import { Hono } from 'hono'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import { z } from 'zod'
import { requireAuth, requireAdmin, requireSelfOrAdmin } from '../middleware/auth'
import { getSettingNumber, getSettingBoolean } from '../services/settings'

export const teachersRouter = new Hono()

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
}

const ACCESS_TOKEN_MAX_AGE = 15 * 60 // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 // 7 days

async function validatePasswordLength(
  password: string
): Promise<{ valid: boolean; minLength: number }> {
  const minLength = await getSettingNumber('min_password_length')
  const effectiveMinLength = minLength > 0 ? minLength : 6
  return {
    valid: password.length >= effectiveMinLength,
    minLength: effectiveMinLength,
  }
}

const teacherSelectPublic = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  room: true,
  isAdmin: true,
  isActive: true,
  mustChangePassword: true,
  departmentId: true,
  createdAt: true,
  updatedAt: true,
  department: { select: { id: true, name: true, shortCode: true, color: true } },
}

const querySchema = z.object({
  departmentId: idSchema.optional(),
  active: z.coerce.boolean().optional(),
})

teachersRouter.get('/', zValidator('query', querySchema), async (c) => {
  const { departmentId, active } = c.req.valid('query')

  const teachers = await db.teacher.findMany({
    where: {
      ...(departmentId && { departmentId }),
      ...(active !== undefined && { isActive: active }),
    },
    select: teacherSelectPublic,
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })

  return c.json({ data: teachers })
})

teachersRouter.get('/me', requireAuth, async (c) => {
  const user = c.get('user')

  const teacher = await db.teacher.findUnique({
    where: { id: user.sub },
    select: teacherSelectPublic,
  })

  if (!teacher) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Lehrkraft nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  return c.json({ data: teacher })
})

teachersRouter.get('/:id', requireAuth, async (c) => {
  const id = c.req.param('id')

  const teacher = await db.teacher.findUnique({
    where: { id },
    select: {
      ...teacherSelectPublic,
      timeSlots: {
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        include: {
          booking: { select: { id: true, companyName: true, contactName: true, status: true } },
        },
      },
    },
  })

  if (!teacher) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Lehrkraft nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  return c.json({ data: teacher })
})

teachersRouter.get('/:id/timeslots', requireAuth, async (c) => {
  const id = c.req.param('id')
  const date = c.req.query('date')

  const teacher = await db.teacher.findUnique({ where: { id } })
  if (!teacher) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Lehrkraft nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  const timeSlots = await db.timeSlot.findMany({
    where: {
      teacherId: id,
      ...(date && { date: new Date(date) }),
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    include: {
      booking: {
        select: { id: true, companyName: true, contactName: true, status: true },
      },
    },
  })

  return c.json({ data: timeSlots })
})

teachersRouter.get('/:id/bookings', requireSelfOrAdmin, async (c) => {
  const id = c.req.param('id')
  const status = c.req.query('status')

  const teacher = await db.teacher.findUnique({ where: { id } })
  if (!teacher) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Lehrkraft nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  const bookings = await db.booking.findMany({
    where: {
      teacherId: id,
      ...(status && { status: status as 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' }),
    },
    orderBy: { timeSlot: { date: 'asc' } },
    include: {
      timeSlot: true,
    },
  })

  return c.json({ data: bookings })
})

teachersRouter.post('/', requireAdmin, zValidator('json', createTeacherSchema), async (c) => {
  const body = c.req.valid('json')

  const passwordCheck = await validatePasswordLength(body.password)
  if (!passwordCheck.valid) {
    return c.json(
      {
        error: ERROR_CODES.VALIDATION_ERROR,
        message: `Passwort muss mindestens ${passwordCheck.minLength} Zeichen haben`,
      },
      HTTP_STATUS.BAD_REQUEST
    )
  }

  const existing = await db.teacher.findUnique({ where: { email: body.email } })
  if (existing) {
    return c.json(
      { error: ERROR_CODES.CONFLICT, message: 'E-Mail bereits registriert' },
      HTTP_STATUS.CONFLICT
    )
  }

  if (body.departmentId) {
    const department = await db.department.findUnique({ where: { id: body.departmentId } })
    if (!department) {
      return c.json(
        { error: ERROR_CODES.NOT_FOUND, message: 'Fachbereich nicht gefunden' },
        HTTP_STATUS.NOT_FOUND
      )
    }
  }

  const requirePasswordChange = await getSettingBoolean('require_password_change')
  const passwordHash = await hashPassword(body.password)

  const teacher = await db.teacher.create({
    data: {
      email: body.email,
      passwordHash,
      firstName: body.firstName,
      lastName: body.lastName,
      room: body.room,
      departmentId: body.departmentId,
      isAdmin: body.isAdmin,
      mustChangePassword: requirePasswordChange,
    },
    select: teacherSelectPublic,
  })

  return c.json({ data: teacher }, HTTP_STATUS.CREATED)
})

teachersRouter.post('/login', zValidator('json', teacherLoginSchema), async (c) => {
  const { email, password } = c.req.valid('json')

  const teacher = await db.teacher.findUnique({
    where: { email },
    include: { department: true },
  })

  if (!teacher) {
    return c.json(
      { error: ERROR_CODES.UNAUTHORIZED, message: 'Ungültige Anmeldedaten' },
      HTTP_STATUS.UNAUTHORIZED
    )
  }

  const isValidPassword = await verifyPassword(password, teacher.passwordHash)
  if (!isValidPassword) {
    return c.json(
      { error: ERROR_CODES.UNAUTHORIZED, message: 'Ungültige Anmeldedaten' },
      HTTP_STATUS.UNAUTHORIZED
    )
  }

  if (!teacher.isActive) {
    return c.json(
      { error: ERROR_CODES.FORBIDDEN, message: 'Konto deaktiviert' },
      HTTP_STATUS.FORBIDDEN
    )
  }

  const tokens = generateTokenPair({
    sub: teacher.id,
    email: teacher.email,
    isAdmin: teacher.isAdmin,
  })

  setCookie(c, 'access_token', tokens.accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  })

  setCookie(c, 'refresh_token', tokens.refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  })

  const { passwordHash: _hash, ...teacherData } = teacher
  return c.json({
    data: teacherData,
    tokens: {
      accessToken: tokens.accessToken,
      expiresIn: ACCESS_TOKEN_MAX_AGE,
    },
  })
})

teachersRouter.post('/refresh', async (c) => {
  const refreshToken = getCookie(c, 'refresh_token')

  if (!refreshToken) {
    return c.json(
      { error: ERROR_CODES.UNAUTHORIZED, message: 'Refresh token erforderlich' },
      HTTP_STATUS.UNAUTHORIZED
    )
  }

  try {
    const payload = verifyRefreshToken(refreshToken)

    const teacher = await db.teacher.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, isAdmin: true, isActive: true },
    })

    if (!teacher || !teacher.isActive) {
      return c.json(
        { error: ERROR_CODES.UNAUTHORIZED, message: 'Ungültiger Token' },
        HTTP_STATUS.UNAUTHORIZED
      )
    }

    const tokens = generateTokenPair({
      sub: teacher.id,
      email: teacher.email,
      isAdmin: teacher.isAdmin,
    })

    setCookie(c, 'access_token', tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    })

    setCookie(c, 'refresh_token', tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    })

    return c.json({
      tokens: {
        accessToken: tokens.accessToken,
        expiresIn: ACCESS_TOKEN_MAX_AGE,
      },
    })
  } catch {
    return c.json(
      { error: ERROR_CODES.UNAUTHORIZED, message: 'Ungültiger oder abgelaufener Token' },
      HTTP_STATUS.UNAUTHORIZED
    )
  }
})

teachersRouter.post('/logout', (c) => {
  deleteCookie(c, 'access_token', { path: '/' })
  deleteCookie(c, 'refresh_token', { path: '/' })
  return c.json({ message: 'Erfolgreich abgemeldet' })
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Aktuelles Passwort erforderlich'),
  newPassword: z.string().min(1, 'Neues Passwort erforderlich'),
})

teachersRouter.post(
  '/:id/change-password',
  requireSelfOrAdmin,
  zValidator('json', changePasswordSchema),
  async (c) => {
    const id = c.req.param('id')
    const { currentPassword, newPassword } = c.req.valid('json')

    const passwordCheck = await validatePasswordLength(newPassword)
    if (!passwordCheck.valid) {
      return c.json(
        {
          error: ERROR_CODES.VALIDATION_ERROR,
          message: `Passwort muss mindestens ${passwordCheck.minLength} Zeichen haben`,
        },
        HTTP_STATUS.BAD_REQUEST
      )
    }

    const teacher = await db.teacher.findUnique({ where: { id } })
    if (!teacher) {
      return c.json(
        { error: ERROR_CODES.NOT_FOUND, message: 'Lehrkraft nicht gefunden' },
        HTTP_STATUS.NOT_FOUND
      )
    }

    const isValidPassword = await verifyPassword(currentPassword, teacher.passwordHash)
    if (!isValidPassword) {
      return c.json(
        { error: ERROR_CODES.UNAUTHORIZED, message: 'Aktuelles Passwort ist falsch' },
        HTTP_STATUS.UNAUTHORIZED
      )
    }

    const newPasswordHash = await hashPassword(newPassword)
    await db.teacher.update({
      where: { id },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
      },
    })

    return c.json({ message: 'Passwort erfolgreich geändert' })
  }
)

const setPasswordSchema = z.object({
  newPassword: z.string().min(1, 'Neues Passwort erforderlich'),
})

teachersRouter.post(
  '/:id/set-password',
  requireAdmin,
  zValidator('json', setPasswordSchema),
  async (c) => {
    const id = c.req.param('id')
    const { newPassword } = c.req.valid('json')

    const passwordCheck = await validatePasswordLength(newPassword)
    if (!passwordCheck.valid) {
      return c.json(
        {
          error: ERROR_CODES.VALIDATION_ERROR,
          message: `Passwort muss mindestens ${passwordCheck.minLength} Zeichen haben`,
        },
        HTTP_STATUS.BAD_REQUEST
      )
    }

    const teacher = await db.teacher.findUnique({ where: { id } })
    if (!teacher) {
      return c.json(
        { error: ERROR_CODES.NOT_FOUND, message: 'Lehrkraft nicht gefunden' },
        HTTP_STATUS.NOT_FOUND
      )
    }

    const newPasswordHash = await hashPassword(newPassword)
    await db.teacher.update({
      where: { id },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: true,
      },
    })

    return c.json({ message: 'Passwort erfolgreich gesetzt' })
  }
)

const patchTeacherSchema = updateTeacherSchema.extend({
  isActive: z.boolean().optional(),
})

teachersRouter.patch(
  '/:id',
  requireSelfOrAdmin,
  zValidator('json', patchTeacherSchema),
  async (c) => {
    const id = c.req.param('id')
    const body = c.req.valid('json')
    const user = c.get('user')

    // Non-admins cannot change isAdmin or isActive
    if (!user.isAdmin) {
      delete body.isAdmin
      delete body.isActive
    }

    const existing = await db.teacher.findUnique({ where: { id } })
    if (!existing) {
      return c.json(
        { error: ERROR_CODES.NOT_FOUND, message: 'Lehrkraft nicht gefunden' },
        HTTP_STATUS.NOT_FOUND
      )
    }

    if (body.email && body.email !== existing.email) {
      const emailTaken = await db.teacher.findUnique({ where: { email: body.email } })
      if (emailTaken) {
        return c.json(
          { error: ERROR_CODES.CONFLICT, message: 'E-Mail bereits vergeben' },
          HTTP_STATUS.CONFLICT
        )
      }
    }

    if (body.departmentId) {
      const department = await db.department.findUnique({ where: { id: body.departmentId } })
      if (!department) {
        return c.json(
          { error: ERROR_CODES.NOT_FOUND, message: 'Fachbereich nicht gefunden' },
          HTTP_STATUS.NOT_FOUND
        )
      }
    }

    const teacher = await db.teacher.update({
      where: { id },
      data: body,
      select: teacherSelectPublic,
    })

    return c.json({ data: teacher })
  }
)

teachersRouter.delete('/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')

  const existing = await db.teacher.findUnique({
    where: { id },
    include: {
      _count: { select: { timeSlots: true, bookings: true } },
    },
  })

  if (!existing) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Lehrkraft nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  if (existing._count.bookings > 0) {
    return c.json(
      {
        error: ERROR_CODES.CONFLICT,
        message:
          'Lehrkraft kann nicht gelöscht werden, da noch Buchungen existieren. Deaktivieren Sie stattdessen das Konto.',
      },
      HTTP_STATUS.CONFLICT
    )
  }

  await db.teacher.delete({ where: { id } })
  return c.json({ message: 'Lehrkraft erfolgreich gelöscht' })
})
