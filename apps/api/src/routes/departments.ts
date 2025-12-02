import { zValidator } from '@hono/zod-validator'
import { db } from '@terminverwaltung/database'
import { HTTP_STATUS, ERROR_CODES } from '@terminverwaltung/shared'
import { Hono } from 'hono'
import { z } from 'zod'

export const departmentsRouter = new Hono()

departmentsRouter.get('/', async (c) => {
  const departments = await db.department.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { teachers: true } },
    },
  })

  return c.json({ data: departments })
})

departmentsRouter.get('/:id', async (c) => {
  const id = c.req.param('id')

  const department = await db.department.findUnique({
    where: { id },
    include: {
      teachers: {
        where: { isActive: true },
        orderBy: { lastName: 'asc' },
        select: { id: true, firstName: true, lastName: true, room: true },
      },
      _count: { select: { teachers: true } },
    },
  })

  if (!department) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Fachbereich nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  return c.json({ data: department })
})

const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Name erforderlich'),
  shortCode: z.string().min(1).max(10),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
})

departmentsRouter.post('/', zValidator('json', createDepartmentSchema), async (c) => {
  const body = c.req.valid('json')

  const existing = await db.department.findFirst({
    where: { OR: [{ name: body.name }, { shortCode: body.shortCode }] },
  })

  if (existing) {
    return c.json(
      { error: ERROR_CODES.CONFLICT, message: 'Fachbereich existiert bereits' },
      HTTP_STATUS.CONFLICT
    )
  }

  const department = await db.department.create({ data: body })
  return c.json({ data: department }, HTTP_STATUS.CREATED)
})

const updateDepartmentSchema = z.object({
  name: z.string().min(1).optional(),
  shortCode: z.string().min(1).max(10).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
})

departmentsRouter.patch('/:id', zValidator('json', updateDepartmentSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')

  const existing = await db.department.findUnique({ where: { id } })
  if (!existing) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Fachbereich nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  if (body.name || body.shortCode) {
    const conflict = await db.department.findFirst({
      where: {
        id: { not: id },
        OR: [
          ...(body.name ? [{ name: body.name }] : []),
          ...(body.shortCode ? [{ shortCode: body.shortCode }] : []),
        ],
      },
    })
    if (conflict) {
      return c.json(
        { error: ERROR_CODES.CONFLICT, message: 'Name oder Kürzel bereits vergeben' },
        HTTP_STATUS.CONFLICT
      )
    }
  }

  const department = await db.department.update({
    where: { id },
    data: body,
    include: { _count: { select: { teachers: true } } },
  })

  return c.json({ data: department })
})

departmentsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id')

  const existing = await db.department.findUnique({
    where: { id },
    include: { _count: { select: { teachers: true } } },
  })

  if (!existing) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Fachbereich nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  if (existing._count.teachers > 0) {
    return c.json(
      {
        error: ERROR_CODES.CONFLICT,
        message: 'Fachbereich kann nicht gelöscht werden, da noch Lehrkräfte zugeordnet sind',
      },
      HTTP_STATUS.CONFLICT
    )
  }

  await db.department.delete({ where: { id } })
  return c.json({ message: 'Fachbereich erfolgreich gelöscht' })
})
