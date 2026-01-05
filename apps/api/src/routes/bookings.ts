import { zValidator } from '@hono/zod-validator'
import { generateCancellationCode } from '@terminverwaltung/auth'
import { db, Prisma } from '@terminverwaltung/database'
import {
  HTTP_STATUS,
  ERROR_CODES,
  NotFoundError,
  SlotAlreadyBookedError,
  AlreadyCancelledError,
  SameSlotError,
  ForbiddenError,
} from '@terminverwaltung/shared'
import {
  createBookingSchema,
  cancelBookingSchema,
  bookingStatusSchema,
  idSchema,
} from '@terminverwaltung/validators'
import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth, requireAdmin } from '../middleware/auth'
import {
  sendConfirmationWithLogging,
  sendCancellationWithLogging,
  sendRebookWithLogging,
  sendTeacherNotificationWithLogging,
} from '../services/email'
import { getSettingBoolean, getSettingNumber, getEmailSettings } from '../services/settings'

export const bookingsRouter = new Hono()

// Helper to check if booking/cancel/rebook is allowed based on notice hours
async function checkNoticeHours(
  timeSlotDate: Date,
  timeSlotStart: Date,
  settingKey: 'booking_notice_hours' | 'cancel_notice_hours'
): Promise<{ allowed: boolean; message?: string }> {
  const noticeHours = await getSettingNumber(settingKey)
  if (noticeHours <= 0) return { allowed: true }

  const slotDateTime = new Date(timeSlotDate)
  slotDateTime.setHours(timeSlotStart.getHours(), timeSlotStart.getMinutes(), 0, 0)

  const now = new Date()
  const hoursUntilSlot = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursUntilSlot < noticeHours) {
    const action = settingKey === 'booking_notice_hours' ? 'gebucht' : 'storniert'
    return {
      allowed: false,
      message: `Termine können nur bis ${noticeHours} Stunden vorher ${action} werden`,
    }
  }

  return { allowed: true }
}

bookingsRouter.post('/', zValidator('json', createBookingSchema), async (c) => {
  const body = c.req.valid('json')

  // Check if booking is enabled
  const bookingEnabled = await getSettingBoolean('booking_enabled')
  if (!bookingEnabled) {
    return c.json(
      { error: ERROR_CODES.FORBIDDEN, message: 'Buchungen sind derzeit deaktiviert' },
      HTTP_STATUS.FORBIDDEN
    )
  }

  // Validate required fields based on settings
  const requirePhone = await getSettingBoolean('require_phone')
  if (requirePhone && (!body.companyPhone || body.companyPhone.trim() === '')) {
    return c.json(
      { error: ERROR_CODES.VALIDATION_ERROR, message: 'Telefonnummer ist erforderlich' },
      HTTP_STATUS.BAD_REQUEST
    )
  }

  const requireContactName = await getSettingBoolean('require_contact_name')
  if (requireContactName && (!body.contactName || body.contactName.trim() === '')) {
    return c.json(
      { error: ERROR_CODES.VALIDATION_ERROR, message: 'Ansprechpartner ist erforderlich' },
      HTTP_STATUS.BAD_REQUEST
    )
  }

  // Check max bookings per company
  const maxBookings = await getSettingNumber('max_bookings_per_company')
  if (maxBookings > 0) {
    const existingBookings = await db.booking.count({
      where: {
        companyEmail: body.companyEmail,
        status: 'CONFIRMED',
      },
    })
    if (existingBookings >= maxBookings) {
      return c.json(
        {
          error: ERROR_CODES.FORBIDDEN,
          message: `Sie haben bereits ${maxBookings} Termin(e) gebucht. Maximale Anzahl erreicht.`,
        },
        HTTP_STATUS.FORBIDDEN
      )
    }
  }

  const result = await db.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const timeSlot = await tx.timeSlot.findUnique({
        where: { id: body.timeSlotId },
        include: {
          teacher: { include: { department: true } },
          booking: true,
        },
      })

      if (!timeSlot) {
        throw new NotFoundError('Zeitslot nicht gefunden')
      }

      if (timeSlot.status !== 'AVAILABLE' || timeSlot.booking) {
        throw new SlotAlreadyBookedError()
      }

      // Check booking notice hours
      const noticeCheck = await checkNoticeHours(
        timeSlot.date,
        timeSlot.startTime,
        'booking_notice_hours'
      )
      if (!noticeCheck.allowed) {
        throw new ForbiddenError(noticeCheck.message)
      }

      await tx.timeSlot.update({
        where: { id: body.timeSlotId },
        data: { status: 'BOOKED' },
      })

      const booking = await tx.booking.create({
        data: {
          timeSlotId: body.timeSlotId,
          teacherId: timeSlot.teacherId,
          companyName: body.companyName,
          companyEmail: body.companyEmail,
          companyPhone: body.companyPhone || null,
          contactName: body.contactName || null,
          studentCount: body.studentCount,
          students: body.students ? JSON.parse(JSON.stringify(body.students)) : undefined,
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

  // Track email warnings to return to the user
  const warnings: string[] = []

  // Send email if enabled
  const emailEnabled = await getSettingBoolean('email_notifications')
  if (emailEnabled) {
    const emailSettings = await getEmailSettings()

    // Send confirmation to company
    const confirmResult = await sendConfirmationWithLogging(result, emailSettings)
    if (!confirmResult.success) {
      warnings.push(
        'Die Bestätigungs-E-Mail konnte nicht gesendet werden. Bitte notieren Sie sich Ihren Buchungscode.'
      )
    }

    // Notify teacher if enabled
    const notifyTeacher = await getSettingBoolean('notify_teacher_on_booking')
    if (notifyTeacher && result.teacher.email) {
      const teacherResult = await sendTeacherNotificationWithLogging(
        result,
        result.teacher.email,
        emailSettings
      )
      if (!teacherResult.success) {
        // Don't warn the customer about internal teacher notification failure
        console.error('Teacher notification failed but not surfacing to user')
      }
    }
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
      ...(warnings.length > 0 && { warnings }),
    },
    HTTP_STATUS.CREATED
  )
})

bookingsRouter.post('/cancel', zValidator('json', cancelBookingSchema), async (c) => {
  const { cancellationCode } = c.req.valid('json')

  // Check if cancellation is allowed
  const allowCancel = await getSettingBoolean('allow_cancel')
  if (!allowCancel) {
    return c.json(
      { error: ERROR_CODES.FORBIDDEN, message: 'Stornierungen sind derzeit deaktiviert' },
      HTTP_STATUS.FORBIDDEN
    )
  }

  const booking = await db.booking.findUnique({
    where: { cancellationCode },
    include: {
      teacher: { include: { department: true } },
      timeSlot: true,
    },
  })

  if (!booking) {
    return c.json(
      { error: ERROR_CODES.INVALID_CANCELLATION_CODE, message: 'Ungültiger Buchungscode' },
      HTTP_STATUS.NOT_FOUND
    )
  }

  if (booking.status === 'CANCELLED') {
    return c.json(
      { error: ERROR_CODES.CONFLICT, message: 'Buchung wurde bereits storniert' },
      HTTP_STATUS.CONFLICT
    )
  }

  // Check cancel notice hours
  const noticeCheck = await checkNoticeHours(
    booking.timeSlot.date,
    booking.timeSlot.startTime,
    'cancel_notice_hours'
  )
  if (!noticeCheck.allowed) {
    return c.json(
      { error: ERROR_CODES.FORBIDDEN, message: noticeCheck.message },
      HTTP_STATUS.FORBIDDEN
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

  // Track email warnings
  const warnings: string[] = []

  // Send email if enabled
  const emailEnabled = await getSettingBoolean('email_notifications')
  if (emailEnabled) {
    const emailSettings = await getEmailSettings()
    const cancelResult = await sendCancellationWithLogging(booking, emailSettings)
    if (!cancelResult.success) {
      warnings.push('Die Stornierungsbestätigung konnte nicht per E-Mail gesendet werden.')
    }
  }

  return c.json({
    message: 'Buchung erfolgreich storniert',
    ...(warnings.length > 0 && { warnings }),
  })
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

  // Include settings for rebook/cancel availability
  const allowRebook = await getSettingBoolean('allow_rebook')
  const allowCancel = await getSettingBoolean('allow_cancel')

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
    permissions: {
      canRebook: allowRebook && booking.status === 'CONFIRMED',
      canCancel: allowCancel && booking.status === 'CONFIRMED',
    },
  })
})

// Admin view: list all bookings with filters
bookingsRouter.get('/', requireAuth, async (c) => {
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

// Admin view: get single booking details
bookingsRouter.get('/:id', requireAuth, async (c) => {
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

// Admin action: update booking status
bookingsRouter.patch(
  '/:id/status',
  requireAdmin,
  zValidator('json', updateBookingStatusSchema),
  async (c) => {
    const id = c.req.param('id')
    const { status } = c.req.valid('json')

    const booking = await db.booking.findUnique({ where: { id } })
    if (!booking) {
      return c.json(
        { error: ERROR_CODES.NOT_FOUND, message: 'Buchung nicht gefunden' },
        HTTP_STATUS.NOT_FOUND
      )
    }

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.booking.update({
        where: { id },
        data: {
          status,
          ...(status === 'CANCELLED' && { cancelledAt: new Date() }),
        },
      })

      if (status === 'CANCELLED') {
        await tx.timeSlot.update({
          where: { id: booking.timeSlotId },
          data: { status: 'AVAILABLE' },
        })
      }

      return result
    })

    return c.json({ data: updated })
  }
)

// Rebook: change to a different timeslot (atomic operation)
const rebookSchema = z.object({
  cancellationCode: z.string().min(1, 'Buchungscode erforderlich'),
  newTimeSlotId: idSchema,
})

bookingsRouter.post('/rebook', zValidator('json', rebookSchema), async (c) => {
  const { cancellationCode, newTimeSlotId } = c.req.valid('json')

  // Check if rebooking is allowed
  const allowRebook = await getSettingBoolean('allow_rebook')
  if (!allowRebook) {
    return c.json(
      { error: ERROR_CODES.FORBIDDEN, message: 'Umbuchungen sind derzeit deaktiviert' },
      HTTP_STATUS.FORBIDDEN
    )
  }

  const result = await db.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const existingBooking = await tx.booking.findUnique({
        where: { cancellationCode },
        include: {
          teacher: { include: { department: true } },
          timeSlot: true,
        },
      })

      if (!existingBooking) {
        throw new NotFoundError('Buchung nicht gefunden')
      }

      if (existingBooking.status === 'CANCELLED') {
        throw new AlreadyCancelledError()
      }

      const newTimeSlot = await tx.timeSlot.findUnique({
        where: { id: newTimeSlotId },
        include: {
          teacher: { include: { department: true } },
          booking: true,
        },
      })

      if (!newTimeSlot) {
        throw new NotFoundError('Neuer Zeitslot nicht gefunden')
      }

      if (newTimeSlot.status !== 'AVAILABLE' || newTimeSlot.booking) {
        throw new SlotAlreadyBookedError('Der neue Termin ist bereits vergeben')
      }

      if (existingBooking.timeSlotId === newTimeSlotId) {
        throw new SameSlotError()
      }

      // Check booking notice hours for the new slot
      const noticeCheck = await checkNoticeHours(
        newTimeSlot.date,
        newTimeSlot.startTime,
        'booking_notice_hours'
      )
      if (!noticeCheck.allowed) {
        throw new ForbiddenError(noticeCheck.message)
      }

      await tx.timeSlot.update({
        where: { id: existingBooking.timeSlotId },
        data: { status: 'AVAILABLE' },
      })

      await tx.timeSlot.update({
        where: { id: newTimeSlotId },
        data: { status: 'BOOKED' },
      })

      const updatedBooking = await tx.booking.update({
        where: { id: existingBooking.id },
        data: {
          timeSlotId: newTimeSlotId,
          teacherId: newTimeSlot.teacherId,
          cancellationCode: generateCancellationCode(),
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

  // Track email warnings
  const warnings: string[] = []

  // Send email if enabled
  const emailEnabled = await getSettingBoolean('email_notifications')
  if (emailEnabled) {
    const emailSettings = await getEmailSettings()
    const rebookResult = await sendRebookWithLogging(
      result.updatedBooking,
      result.oldTimeSlot,
      emailSettings
    )
    if (!rebookResult.success) {
      warnings.push(
        'Die Umbuchungsbestätigung konnte nicht per E-Mail gesendet werden. Bitte notieren Sie sich Ihren neuen Buchungscode.'
      )
    }
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
    ...(warnings.length > 0 && { warnings }),
  })
})
