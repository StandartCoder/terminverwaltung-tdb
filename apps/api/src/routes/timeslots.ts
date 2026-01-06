import { zValidator } from '@hono/zod-validator'
import { db } from '@terminverwaltung/database'
import {
  HTTP_STATUS,
  ERROR_CODES,
  parseTimeString,
  parseDateString,
} from '@terminverwaltung/shared'
import {
  timeSlotFilterSchema,
  createTimeSlotSchema as baseCreateTimeSlotSchema,
  createBulkTimeSlotsSchema as baseCreateBulkTimeSlotsSchema,
  idSchema,
} from '@terminverwaltung/validators'
import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { getSetting, getSettingNumber } from '../services/settings'

export const timeslotsRouter = new Hono()

async function getActiveEventForDate(date: Date): Promise<{
  valid: boolean
  error?: { code: string; message: string; status: number }
}> {
  const activeEvent = await db.event.findFirst({
    where: { isActive: true },
    select: { id: true, startDate: true, endDate: true, name: true },
  })

  if (!activeEvent) {
    return {
      valid: false,
      error: {
        code: ERROR_CODES.FORBIDDEN,
        message:
          'Keine aktive Veranstaltung vorhanden. Zeitslots können nur während einer aktiven Veranstaltung erstellt werden.',
        status: HTTP_STATUS.FORBIDDEN,
      },
    }
  }

  const slotDate = new Date(date)
  slotDate.setHours(0, 0, 0, 0)

  const eventStart = new Date(activeEvent.startDate)
  eventStart.setHours(0, 0, 0, 0)

  const eventEnd = new Date(activeEvent.endDate)
  eventEnd.setHours(0, 0, 0, 0)

  if (slotDate < eventStart || slotDate > eventEnd) {
    const formatDate = (d: Date) => d.toLocaleDateString('de-DE')
    return {
      valid: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: `Das Datum liegt außerhalb des Veranstaltungszeitraums (${formatDate(eventStart)} - ${formatDate(eventEnd)}).`,
        status: HTTP_STATUS.BAD_REQUEST,
      },
    }
  }

  return { valid: true }
}

// Get timeslot settings (defaults for generating slots)
timeslotsRouter.get('/settings', async (c) => {
  const [slotDuration, slotBuffer, dayStart, dayEnd] = await Promise.all([
    getSettingNumber('slot_duration_minutes'),
    getSettingNumber('slot_buffer_minutes'),
    getSetting('day_start_time'),
    getSetting('day_end_time'),
  ])

  return c.json({
    data: {
      slotDurationMinutes: slotDuration || 20,
      slotBufferMinutes: slotBuffer || 0,
      dayStartTime: dayStart || '08:00',
      dayEndTime: dayEnd || '18:00',
    },
  })
})

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
  const dates = await db.timeSlot.groupBy({
    by: ['date'],
    where: { status: 'AVAILABLE' },
    _count: { id: true },
    orderBy: { date: 'asc' },
  })

  return c.json({
    data: dates.map((d) => ({
      date: d.date,
      availableCount: d._count.id,
    })),
  })
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

timeslotsRouter.post('/', requireAuth, zValidator('json', createTimeSlotSchema), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')

  // Teachers can only create timeslots for themselves
  if (!user.isAdmin && body.teacherId !== user.sub) {
    return c.json(
      { error: ERROR_CODES.FORBIDDEN, message: 'Keine Berechtigung für diese Aktion' },
      HTTP_STATUS.FORBIDDEN
    )
  }

  const teacher = await db.teacher.findUnique({ where: { id: body.teacherId } })
  if (!teacher) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Lehrkraft nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  const dateObj = parseDateString(body.date)

  // Validate active event and date range
  const eventValidation = await getActiveEventForDate(dateObj)
  if (!eventValidation.valid) {
    return c.json(
      { error: eventValidation.error!.code, message: eventValidation.error!.message },
      eventValidation.error!.status as 400 | 403
    )
  }

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

timeslotsRouter.post('/bulk', requireAuth, zValidator('json', createBulkSchema), async (c) => {
  const { teacherId, date, slots } = c.req.valid('json')
  const user = c.get('user')

  // Teachers can only create timeslots for themselves
  if (!user.isAdmin && teacherId !== user.sub) {
    return c.json(
      { error: ERROR_CODES.FORBIDDEN, message: 'Keine Berechtigung für diese Aktion' },
      HTTP_STATUS.FORBIDDEN
    )
  }

  const teacher = await db.teacher.findUnique({ where: { id: teacherId } })
  if (!teacher) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Lehrkraft nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  const dateObj = parseDateString(date)

  // Validate active event and date range
  const eventValidation = await getActiveEventForDate(dateObj)
  if (!eventValidation.valid) {
    return c.json(
      { error: eventValidation.error!.code, message: eventValidation.error!.message },
      eventValidation.error!.status as 400 | 403
    )
  }

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

timeslotsRouter.patch(
  '/:id/status',
  requireAuth,
  zValidator('json', updateStatusSchema),
  async (c) => {
    const id = c.req.param('id')
    const { status } = c.req.valid('json')
    const user = c.get('user')

    const existing = await db.timeSlot.findUnique({ where: { id } })
    if (!existing) {
      return c.json(
        { error: ERROR_CODES.NOT_FOUND, message: 'Zeitslot nicht gefunden' },
        HTTP_STATUS.NOT_FOUND
      )
    }

    if (!user.isAdmin && existing.teacherId !== user.sub) {
      return c.json(
        { error: ERROR_CODES.FORBIDDEN, message: 'Keine Berechtigung für diese Aktion' },
        HTTP_STATUS.FORBIDDEN
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
  }
)

timeslotsRouter.delete('/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')

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

  if (!user.isAdmin && existing.teacherId !== user.sub) {
    return c.json(
      { error: ERROR_CODES.FORBIDDEN, message: 'Keine Berechtigung für diese Aktion' },
      HTTP_STATUS.FORBIDDEN
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

// Generate timeslots for a teacher based on settings
const generateSlotsSchema = z.object({
  teacherId: idSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  slotDurationMinutes: z.number().min(5).max(120).optional(),
  slotBufferMinutes: z.number().min(0).max(60).optional(),
})

timeslotsRouter.post(
  '/generate',
  requireAuth,
  zValidator('json', generateSlotsSchema),
  async (c) => {
    const body = c.req.valid('json')
    const user = c.get('user')

    // Teachers can only generate timeslots for themselves
    if (!user.isAdmin && body.teacherId !== user.sub) {
      return c.json(
        { error: ERROR_CODES.FORBIDDEN, message: 'Keine Berechtigung für diese Aktion' },
        HTTP_STATUS.FORBIDDEN
      )
    }

    const teacher = await db.teacher.findUnique({ where: { id: body.teacherId } })
    if (!teacher) {
      return c.json(
        { error: ERROR_CODES.NOT_FOUND, message: 'Lehrkraft nicht gefunden' },
        HTTP_STATUS.NOT_FOUND
      )
    }

    const dateObj = parseDateString(body.date)

    // Validate active event and date range
    const eventValidation = await getActiveEventForDate(dateObj)
    if (!eventValidation.valid) {
      return c.json(
        { error: eventValidation.error!.code, message: eventValidation.error!.message },
        eventValidation.error!.status as 400 | 403
      )
    }

    // Get settings, use provided values or fall back to settings
    const [settingDuration, settingBuffer, settingDayStart, settingDayEnd] = await Promise.all([
      getSettingNumber('slot_duration_minutes'),
      getSettingNumber('slot_buffer_minutes'),
      getSetting('day_start_time'),
      getSetting('day_end_time'),
    ])

    const slotDuration = (body.slotDurationMinutes ?? settingDuration) || 20
    const slotBuffer = (body.slotBufferMinutes ?? settingBuffer) || 0
    const dayStart = (body.startTime ?? settingDayStart) || '08:00'
    const dayEnd = (body.endTime ?? settingDayEnd) || '18:00'

    // Parse start and end times
    const [startHour, startMin] = dayStart.split(':').map(Number)
    const [endHour, endMin] = dayEnd.split(':').map(Number)

    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    if (startMinutes >= endMinutes) {
      return c.json(
        { error: ERROR_CODES.VALIDATION_ERROR, message: 'Startzeit muss vor Endzeit liegen' },
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // Generate slots
    const slots: { startTime: Date; endTime: Date }[] = []
    let currentMinutes = startMinutes

    while (currentMinutes + slotDuration <= endMinutes) {
      const slotStartHour = Math.floor(currentMinutes / 60)
      const slotStartMin = currentMinutes % 60
      const slotEndMinutes = currentMinutes + slotDuration
      const slotEndHour = Math.floor(slotEndMinutes / 60)
      const slotEndMin = slotEndMinutes % 60

      const startTimeStr = `${slotStartHour.toString().padStart(2, '0')}:${slotStartMin.toString().padStart(2, '0')}`
      const endTimeStr = `${slotEndHour.toString().padStart(2, '0')}:${slotEndMin.toString().padStart(2, '0')}`

      slots.push({
        startTime: parseTimeString(startTimeStr),
        endTime: parseTimeString(endTimeStr),
      })

      currentMinutes += slotDuration + slotBuffer
    }

    if (slots.length === 0) {
      return c.json(
        {
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'Keine Zeitslots können mit diesen Einstellungen erstellt werden',
        },
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // Create slots (skip existing ones)
    const createdSlots = await db.$transaction(
      slots.map((slot) =>
        db.timeSlot.upsert({
          where: {
            teacherId_date_startTime: {
              teacherId: body.teacherId,
              date: dateObj,
              startTime: slot.startTime,
            },
          },
          update: {},
          create: {
            teacherId: body.teacherId,
            date: dateObj,
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: 'AVAILABLE',
          },
        })
      )
    )

    return c.json(
      {
        data: createdSlots,
        count: createdSlots.length,
        settings: {
          slotDurationMinutes: slotDuration,
          slotBufferMinutes: slotBuffer,
          dayStartTime: dayStart,
          dayEndTime: dayEnd,
        },
      },
      HTTP_STATUS.CREATED
    )
  }
)
