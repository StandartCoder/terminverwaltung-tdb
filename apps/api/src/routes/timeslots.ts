import { zValidator } from '@hono/zod-validator'
import { db } from '@terminverwaltung/database'
import {
  timeSlotFilterSchema,
  createTimeSlotSchema as baseCreateTimeSlotSchema,
  createBulkTimeSlotsSchema as baseCreateBulkTimeSlotsSchema,
  idSchema,
} from '@terminverwaltung/validators'
import { Hono } from 'hono'
import { z } from 'zod'
import { HTTP_STATUS, ERROR_CODES } from '../lib/constants'
import { parseTimeString, parseDateString } from '../lib/utils'

export const timeslotsRouter = new Hono()

// Use the filter schema from validators for query params
timeslotsRouter.get('/', zValidator('query', timeSlotFilterSchema), async (c) => {
  const { teacherId, departmentId, date, available } = c.req.valid('query')

  const timeSlots = await db.timeSlot.findMany({
    where: {
      ...(teacherId && { teacherId }),
      ...(departmentId && { teacher: { departmentId } }),
      ...(date && { date: parseDateString(date) }),
      ...(available && { status: 'AVAILABLE' }),
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    include: {
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          room: true,
          department: { select: { id: true, name: true, shortCode: true, color: true } },
        },
      },
      booking: {
        select: { id: true, companyName: true, status: true },
      },
    },
  })

  return c.json({ data: timeSlots })
})

timeslotsRouter.get('/available', zValidator('query', timeSlotFilterSchema), async (c) => {
  const { teacherId, departmentId, date } = c.req.valid('query')

  const timeSlots = await db.timeSlot.findMany({
    where: {
      status: 'AVAILABLE',
      ...(teacherId && { teacherId }),
      ...(departmentId && { teacher: { departmentId } }),
      ...(date && { date: parseDateString(date) }),
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    include: {
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          room: true,
          department: { select: { id: true, name: true, shortCode: true, color: true } },
        },
      },
    },
  })

  return c.json({ data: timeSlots })
})

timeslotsRouter.get('/dates', async (c) => {
  const dates = await db.timeSlot.findMany({
    where: { status: 'AVAILABLE' },
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'asc' },
  })

  return c.json({ data: dates.map((d) => d.date) })
})

timeslotsRouter.get('/:id', async (c) => {
  const id = c.req.param('id')

  const timeSlot = await db.timeSlot.findUnique({
    where: { id },
    include: {
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          room: true,
          department: true,
        },
      },
      booking: {
        select: { id: true, companyName: true, contactName: true, status: true },
      },
    },
  })

  if (!timeSlot) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Zeitslot nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  return c.json({ data: timeSlot })
})

// Extend base schema to make teacherId required for this endpoint
const createTimeSlotSchema = baseCreateTimeSlotSchema.extend({
  teacherId: idSchema,
})

timeslotsRouter.post('/', zValidator('json', createTimeSlotSchema), async (c) => {
  const body = c.req.valid('json')

  const teacher = await db.teacher.findUnique({ where: { id: body.teacherId } })
  if (!teacher) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Lehrkraft nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  const dateObj = parseDateString(body.date)
  const startTimeObj = parseTimeString(body.startTime)
  const endTimeObj = parseTimeString(body.endTime)

  const existing = await db.timeSlot.findUnique({
    where: {
      teacherId_date_startTime: {
        teacherId: body.teacherId,
        date: dateObj,
        startTime: startTimeObj,
      },
    },
  })

  if (existing) {
    return c.json(
      { error: ERROR_CODES.CONFLICT, message: 'Zeitslot existiert bereits' },
      HTTP_STATUS.CONFLICT
    )
  }

  const timeSlot = await db.timeSlot.create({
    data: {
      teacherId: body.teacherId,
      date: dateObj,
      startTime: startTimeObj,
      endTime: endTimeObj,
      status: 'AVAILABLE',
    },
    include: { teacher: { select: { firstName: true, lastName: true } } },
  })

  return c.json({ data: timeSlot }, HTTP_STATUS.CREATED)
})

// Extend base bulk schema to make teacherId required
const createBulkSchema = baseCreateBulkTimeSlotsSchema.extend({
  teacherId: idSchema,
})

timeslotsRouter.post('/bulk', zValidator('json', createBulkSchema), async (c) => {
  const { teacherId, date, slots } = c.req.valid('json')

  const teacher = await db.teacher.findUnique({ where: { id: teacherId } })
  if (!teacher) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Lehrkraft nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  const dateObj = parseDateString(date)

  const createdSlots = await db.$transaction(
    slots.map((slot) =>
      db.timeSlot.upsert({
        where: {
          teacherId_date_startTime: {
            teacherId,
            date: dateObj,
            startTime: parseTimeString(slot.startTime),
          },
        },
        update: {},
        create: {
          teacherId,
          date: dateObj,
          startTime: parseTimeString(slot.startTime),
          endTime: parseTimeString(slot.endTime),
          status: 'AVAILABLE',
        },
      })
    )
  )

  return c.json({ data: createdSlots, count: createdSlots.length }, HTTP_STATUS.CREATED)
})

const updateStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'BLOCKED']),
})

timeslotsRouter.patch('/:id/status', zValidator('json', updateStatusSchema), async (c) => {
  const id = c.req.param('id')
  const { status } = c.req.valid('json')

  const existing = await db.timeSlot.findUnique({ where: { id } })
  if (!existing) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Zeitslot nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  if (existing.status === 'BOOKED') {
    return c.json(
      { error: ERROR_CODES.CONFLICT, message: 'Gebuchter Slot kann nicht geändert werden' },
      HTTP_STATUS.CONFLICT
    )
  }

  const timeSlot = await db.timeSlot.update({
    where: { id },
    data: { status },
  })

  return c.json({ data: timeSlot })
})

timeslotsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id')

  const existing = await db.timeSlot.findUnique({
    where: { id },
    include: { booking: true },
  })

  if (!existing) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Zeitslot nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  if (existing.booking) {
    return c.json(
      { error: ERROR_CODES.CONFLICT, message: 'Gebuchter Slot kann nicht gelöscht werden' },
      HTTP_STATUS.CONFLICT
    )
  }

  await db.timeSlot.delete({ where: { id } })
  return c.json({ message: 'Zeitslot gelöscht' })
})
