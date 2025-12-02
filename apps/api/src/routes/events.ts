import { zValidator } from '@hono/zod-validator'
import { db } from '@terminverwaltung/database'
import { HTTP_STATUS, ERROR_CODES } from '@terminverwaltung/shared'
import { Hono } from 'hono'
import { z } from 'zod'

export const eventsRouter = new Hono()

eventsRouter.get('/', async (c) => {
  const events = await db.event.findMany({
    orderBy: { startDate: 'desc' },
  })

  return c.json({ data: events })
})

eventsRouter.get('/active', async (c) => {
  const event = await db.event.findFirst({
    where: { isActive: true },
    orderBy: { startDate: 'desc' },
  })

  if (!event) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Keine aktive Veranstaltung' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  return c.json({ data: event })
})

eventsRouter.get('/:id', async (c) => {
  const id = c.req.param('id')

  const event = await db.event.findUnique({ where: { id } })

  if (!event) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Veranstaltung nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  return c.json({ data: event })
})

const createEventSchema = z.object({
  name: z.string().min(1, 'Name erforderlich'),
  description: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  bookingOpenAt: z.string().datetime().optional(),
  bookingCloseAt: z.string().datetime().optional(),
  defaultSlotLength: z.number().int().min(5).max(120).optional().default(20),
  isActive: z.boolean().optional().default(false),
})

eventsRouter.post('/', zValidator('json', createEventSchema), async (c) => {
  const body = c.req.valid('json')

  // If setting as active, deactivate all other events
  if (body.isActive) {
    await db.event.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    })
  }

  const event = await db.event.create({
    data: {
      name: body.name,
      description: body.description,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      bookingOpenAt: body.bookingOpenAt ? new Date(body.bookingOpenAt) : null,
      bookingCloseAt: body.bookingCloseAt ? new Date(body.bookingCloseAt) : null,
      defaultSlotLength: body.defaultSlotLength,
      isActive: body.isActive,
    },
  })

  return c.json({ data: event }, HTTP_STATUS.CREATED)
})

const updateEventSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  bookingOpenAt: z.string().datetime().nullable().optional(),
  bookingCloseAt: z.string().datetime().nullable().optional(),
  defaultSlotLength: z.number().int().min(5).max(120).optional(),
  isActive: z.boolean().optional(),
})

eventsRouter.patch('/:id', zValidator('json', updateEventSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')

  const existing = await db.event.findUnique({ where: { id } })
  if (!existing) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Veranstaltung nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  // If setting as active, deactivate all other events
  if (body.isActive === true) {
    await db.event.updateMany({
      where: { isActive: true, id: { not: id } },
      data: { isActive: false },
    })
  }

  const event = await db.event.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.startDate && { startDate: new Date(body.startDate) }),
      ...(body.endDate && { endDate: new Date(body.endDate) }),
      ...(body.bookingOpenAt !== undefined && {
        bookingOpenAt: body.bookingOpenAt ? new Date(body.bookingOpenAt) : null,
      }),
      ...(body.bookingCloseAt !== undefined && {
        bookingCloseAt: body.bookingCloseAt ? new Date(body.bookingCloseAt) : null,
      }),
      ...(body.defaultSlotLength !== undefined && { defaultSlotLength: body.defaultSlotLength }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  })

  return c.json({ data: event })
})

eventsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id')

  const existing = await db.event.findUnique({ where: { id } })
  if (!existing) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Veranstaltung nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  await db.event.delete({ where: { id } })
  return c.json({ message: 'Veranstaltung erfolgreich gelöscht' })
})
