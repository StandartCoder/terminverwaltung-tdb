import { zValidator } from '@hono/zod-validator'
import { hashPassword, verifyPassword } from '@terminverwaltung/auth'
import { db } from '@terminverwaltung/database'
import { HTTP_STATUS, ERROR_CODES } from '@terminverwaltung/shared'
import {
  teacherLoginSchema,
  createTeacherSchema,
  updateTeacherSchema,
  idSchema,
} from '@terminverwaltung/validators'
import { Hono } from 'hono'
import { z } from 'zod'

export const teachersRouter = new Hono()

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

teachersRouter.get('/:id', async (c) => {
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

teachersRouter.get('/:id/timeslots', async (c) => {
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

teachersRouter.get('/:id/bookings', async (c) => {
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

teachersRouter.post('/', zValidator('json', createTeacherSchema), async (c) => {
  const body = c.req.valid('json')

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

  const teacher = await db.teacher.create({
    data: {
      email: body.email,
      passwordHash: hashPassword(body.password),
      firstName: body.firstName,
      lastName: body.lastName,
      room: body.room,
      departmentId: body.departmentId,
      isAdmin: body.isAdmin,
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

  if (!teacher || !verifyPassword(password, teacher.passwordHash)) {
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

  const { passwordHash: _hash, ...teacherData } = teacher
  return c.json({ data: teacherData })
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Aktuelles Passwort erforderlich'),
  newPassword: z.string().min(6, 'Mindestens 6 Zeichen'),
})

teachersRouter.post('/:id/change-password', zValidator('json', changePasswordSchema), async (c) => {
  const id = c.req.param('id')
  const { currentPassword, newPassword } = c.req.valid('json')

  const teacher = await db.teacher.findUnique({ where: { id } })
  if (!teacher) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Lehrkraft nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  if (!verifyPassword(currentPassword, teacher.passwordHash)) {
    return c.json(
      { error: ERROR_CODES.UNAUTHORIZED, message: 'Aktuelles Passwort ist falsch' },
      HTTP_STATUS.UNAUTHORIZED
    )
  }

  await db.teacher.update({
    where: { id },
    data: {
      passwordHash: hashPassword(newPassword),
      mustChangePassword: false,
    },
  })

  return c.json({ message: 'Passwort erfolgreich geändert' })
})

const setPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Mindestens 6 Zeichen'),
})

teachersRouter.post('/:id/set-password', zValidator('json', setPasswordSchema), async (c) => {
  const id = c.req.param('id')
  const { newPassword } = c.req.valid('json')

  const teacher = await db.teacher.findUnique({ where: { id } })
  if (!teacher) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Lehrkraft nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  await db.teacher.update({
    where: { id },
    data: {
      passwordHash: hashPassword(newPassword),
      mustChangePassword: true,
    },
  })

  return c.json({ message: 'Passwort erfolgreich gesetzt' })
})

// Extend base schema with isActive for PATCH endpoint
const patchTeacherSchema = updateTeacherSchema.extend({
  isActive: z.boolean().optional(),
})

teachersRouter.patch('/:id', zValidator('json', patchTeacherSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')

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
})

teachersRouter.delete('/:id', async (c) => {
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
