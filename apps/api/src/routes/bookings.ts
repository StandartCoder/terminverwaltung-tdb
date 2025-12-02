import { zValidator } from '@hono/zod-validator'
import { generateCancellationCode } from '@terminverwaltung/auth'
import { db, Prisma } from '@terminverwaltung/database'
import {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendRebookConfirmation,
} from '@terminverwaltung/email'
import { HTTP_STATUS, ERROR_CODES } from '@terminverwaltung/shared'
import {
  createBookingSchema,
  cancelBookingSchema,
  bookingStatusSchema,
  idSchema,
} from '@terminverwaltung/validators'
import { Hono } from 'hono'
import { z } from 'zod'

export const bookingsRouter = new Hono()

bookingsRouter.post('/', zValidator('json', createBookingSchema), async (c) => {
  const body = c.req.valid('json')

  const result = await db.$transaction(
    async (tx) => {
      const timeSlot = await tx.timeSlot.findUnique({
        where: { id: body.timeSlotId },
        include: {
          teacher: { include: { department: true } },
          booking: true,
        },
      })

      if (!timeSlot) {
        throw new Error('NOT_FOUND:Zeitslot nicht gefunden')
      }

      if (timeSlot.status !== 'AVAILABLE' || timeSlot.booking) {
        throw new Error('SLOT_ALREADY_BOOKED:Dieser Termin ist bereits vergeben')
      }

      await tx.timeSlot.update({
        where: { id: body.timeSlotId },
        data: { status: 'BOOKED' },
      })

      // Create booking with company info stored directly (no separate Company entity)
      const booking = await tx.booking.create({
        data: {
          timeSlotId: body.timeSlotId,
          teacherId: timeSlot.teacherId,
          companyName: body.companyName,
          companyEmail: body.companyEmail,
          companyPhone: body.companyPhone || null,
          contactName: body.contactName || null,
          studentCount: body.studentCount,
          studentName: body.studentName || null,
          studentClass: body.studentClass || null,
          parentName: body.parentName || null,
          parentEmail: body.parentEmail || null,
          notes: body.notes || null,
          cancellationCode: generateCancellationCode(),
        },
        include: {
          teacher: { include: { department: true } },
          timeSlot: true,
        },
      })

      return booking
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  )

  try {
    await sendBookingConfirmation(result)
  } catch (emailError) {
    console.error('Failed to send confirmation email:', emailError)
  }

  return c.json(
    {
      data: {
        id: result.id,
        status: result.status,
        bookedAt: result.bookedAt,
        cancellationCode: result.cancellationCode,
        timeSlot: result.timeSlot,
        teacher: {
          firstName: result.teacher.firstName,
          lastName: result.teacher.lastName,
          room: result.teacher.room,
          department: result.teacher.department,
        },
      },
    },
    HTTP_STATUS.CREATED
  )
})

bookingsRouter.post('/cancel', zValidator('json', cancelBookingSchema), async (c) => {
  const { cancellationCode } = c.req.valid('json')

  const booking = await db.booking.findUnique({
    where: { cancellationCode },
    include: {
      teacher: { include: { department: true } },
      timeSlot: true,
    },
  })

  if (!booking) {
    return c.json(
      { error: ERROR_CODES.INVALID_CANCELLATION_CODE, message: 'Ungültiger Stornierungscode' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  if (booking.status === 'CANCELLED') {
    return c.json(
      { error: ERROR_CODES.CONFLICT, message: 'Buchung wurde bereits storniert' },
      HTTP_STATUS.CONFLICT
    )
  }

  await db.$transaction([
    db.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    }),
    db.timeSlot.update({
      where: { id: booking.timeSlotId },
      data: { status: 'AVAILABLE' },
    }),
  ])

  try {
    await sendBookingCancellation(booking)
  } catch (emailError) {
    console.error('Failed to send cancellation email:', emailError)
  }

  return c.json({ message: 'Buchung erfolgreich storniert' })
})

bookingsRouter.get('/check/:code', async (c) => {
  const code = c.req.param('code')

  const booking = await db.booking.findUnique({
    where: { cancellationCode: code },
    include: {
      teacher: {
        select: { firstName: true, lastName: true, room: true, department: true },
      },
      timeSlot: true,
    },
  })

  if (!booking) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Buchung nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  return c.json({
    data: {
      id: booking.id,
      status: booking.status,
      bookedAt: booking.bookedAt,
      cancelledAt: booking.cancelledAt,
      companyName: booking.companyName,
      teacher: booking.teacher,
      timeSlot: booking.timeSlot,
    },
  })
})

bookingsRouter.get('/', async (c) => {
  const status = c.req.query('status')
  const teacherId = c.req.query('teacherId')
  const companyEmail = c.req.query('companyEmail')
  const dateFrom = c.req.query('dateFrom')
  const dateTo = c.req.query('dateTo')

  const bookings = await db.booking.findMany({
    where: {
      ...(status && { status: status as 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' }),
      ...(teacherId && { teacherId }),
      ...(companyEmail && { companyEmail }),
      ...(dateFrom && { timeSlot: { date: { gte: new Date(dateFrom) } } }),
      ...(dateTo && { timeSlot: { date: { lte: new Date(dateTo) } } }),
    },
    orderBy: { timeSlot: { date: 'asc' } },
    include: {
      teacher: {
        select: { id: true, firstName: true, lastName: true, room: true, department: true },
      },
      timeSlot: true,
    },
  })

  return c.json({ data: bookings })
})

bookingsRouter.get('/:id', async (c) => {
  const id = c.req.param('id')

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      teacher: { include: { department: true } },
      timeSlot: true,
    },
  })

  if (!booking) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Buchung nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  return c.json({ data: booking })
})

const updateBookingStatusSchema = z.object({
  status: bookingStatusSchema,
})

bookingsRouter.patch('/:id/status', zValidator('json', updateBookingStatusSchema), async (c) => {
  const id = c.req.param('id')
  const { status } = c.req.valid('json')

  const booking = await db.booking.findUnique({ where: { id } })
  if (!booking) {
    return c.json(
      { error: ERROR_CODES.NOT_FOUND, message: 'Buchung nicht gefunden' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  const updated = await db.booking.update({
    where: { id },
    data: {
      status,
      ...(status === 'CANCELLED' && { cancelledAt: new Date() }),
    },
  })

  if (status === 'CANCELLED') {
    await db.timeSlot.update({
      where: { id: booking.timeSlotId },
      data: { status: 'AVAILABLE' },
    })
  }

  return c.json({ data: updated })
})

// Rebook: change to a different timeslot (atomic operation)
const rebookSchema = z.object({
  cancellationCode: z.string().min(1, 'Stornierungscode erforderlich'),
  newTimeSlotId: idSchema,
})

bookingsRouter.post('/rebook', zValidator('json', rebookSchema), async (c) => {
  const { cancellationCode, newTimeSlotId } = c.req.valid('json')

  const result = await db.$transaction(
    async (tx) => {
      // Find existing booking
      const existingBooking = await tx.booking.findUnique({
        where: { cancellationCode },
        include: {
          teacher: { include: { department: true } },
          timeSlot: true,
        },
      })

      if (!existingBooking) {
        throw new Error('NOT_FOUND:Buchung nicht gefunden')
      }

      if (existingBooking.status === 'CANCELLED') {
        throw new Error('ALREADY_CANCELLED:Diese Buchung wurde bereits storniert')
      }

      // Check new timeslot availability
      const newTimeSlot = await tx.timeSlot.findUnique({
        where: { id: newTimeSlotId },
        include: {
          teacher: { include: { department: true } },
          booking: true,
        },
      })

      if (!newTimeSlot) {
        throw new Error('NOT_FOUND:Neuer Zeitslot nicht gefunden')
      }

      if (newTimeSlot.status !== 'AVAILABLE' || newTimeSlot.booking) {
        throw new Error('SLOT_ALREADY_BOOKED:Der neue Termin ist bereits vergeben')
      }

      // Same slot check
      if (existingBooking.timeSlotId === newTimeSlotId) {
        throw new Error('SAME_SLOT:Sie haben bereits diesen Termin gebucht')
      }

      // Release old timeslot
      await tx.timeSlot.update({
        where: { id: existingBooking.timeSlotId },
        data: { status: 'AVAILABLE' },
      })

      // Book new timeslot
      await tx.timeSlot.update({
        where: { id: newTimeSlotId },
        data: { status: 'BOOKED' },
      })

      // Update booking with new timeslot and teacher
      const updatedBooking = await tx.booking.update({
        where: { id: existingBooking.id },
        data: {
          timeSlotId: newTimeSlotId,
          teacherId: newTimeSlot.teacherId,
          cancellationCode: generateCancellationCode(), // Generate new code for security
        },
        include: {
          teacher: { include: { department: true } },
          timeSlot: true,
        },
      })

      return { updatedBooking, oldTimeSlot: existingBooking.timeSlot }
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  )

  // Send rebook confirmation email
  try {
    await sendRebookConfirmation(result.updatedBooking, result.oldTimeSlot)
  } catch (emailError) {
    console.error('Failed to send rebook confirmation email:', emailError)
  }

  return c.json({
    data: {
      id: result.updatedBooking.id,
      status: result.updatedBooking.status,
      bookedAt: result.updatedBooking.bookedAt,
      cancellationCode: result.updatedBooking.cancellationCode,
      timeSlot: result.updatedBooking.timeSlot,
      teacher: {
        firstName: result.updatedBooking.teacher.firstName,
        lastName: result.updatedBooking.teacher.lastName,
        room: result.updatedBooking.teacher.room,
        department: result.updatedBooking.teacher.department,
      },
    },
  })
})
