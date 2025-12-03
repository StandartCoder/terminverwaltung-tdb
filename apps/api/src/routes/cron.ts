import { db } from '@terminverwaltung/database'
import { sendBookingReminder, type EmailSettings } from '@terminverwaltung/email'
import { Hono } from 'hono'
import { getSettingBoolean, getSettingNumber, getSetting } from '../services/settings'

export const cronRouter = new Hono()

const CRON_SECRET = process.env.CRON_SECRET || ''

// Middleware to verify cron secret (for external cron services like Vercel Cron, Railway, etc.)
function verifyCronSecret(c: { req: { header: (name: string) => string | undefined } }): boolean {
  if (!CRON_SECRET) {
    console.warn('CRON_SECRET not set - cron endpoints are unprotected')
    return true
  }
  const providedSecret =
    c.req.header('x-cron-secret') || c.req.header('authorization')?.replace('Bearer ', '')
  return providedSecret === CRON_SECRET
}

async function getEmailSettings(): Promise<EmailSettings> {
  const [schoolName, schoolEmail, schoolPhone, publicUrl, emailFromName, emailReplyTo] =
    await Promise.all([
      getSetting('school_name'),
      getSetting('school_email'),
      getSetting('school_phone'),
      getSetting('public_url'),
      getSetting('email_from_name'),
      getSetting('email_reply_to'),
    ])
  return { schoolName, schoolEmail, schoolPhone, publicUrl, emailFromName, emailReplyTo }
}

// POST /api/cron/reminders - Send booking reminders
// Should be called periodically (e.g., every 15 minutes) by an external cron service
cronRouter.post('/reminders', async (c) => {
  if (!verifyCronSecret(c)) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // Check if reminders are enabled
  const sendReminder = await getSettingBoolean('send_reminder')
  if (!sendReminder) {
    return c.json({ message: 'Reminders are disabled', sent: 0 })
  }

  // Check if email notifications are enabled globally
  const emailEnabled = await getSettingBoolean('email_notifications')
  if (!emailEnabled) {
    return c.json({ message: 'Email notifications are disabled', sent: 0 })
  }

  const reminderHours = await getSettingNumber('reminder_hours_before')
  if (reminderHours <= 0) {
    return c.json({ message: 'Reminder hours not configured', sent: 0 })
  }

  const now = new Date()

  // Calculate the time window for reminders
  // We want to send reminders for appointments that are:
  // - More than (reminderHours - 0.5) hours away (to avoid sending too early)
  // - Less than (reminderHours + 0.5) hours away (to catch all in the window)
  // This gives a 1-hour window to account for cron timing
  const minTime = new Date(now.getTime() + (reminderHours - 0.5) * 60 * 60 * 1000)
  const maxTime = new Date(now.getTime() + (reminderHours + 0.5) * 60 * 60 * 1000)

  // Find all confirmed bookings in the reminder window that haven't been reminded yet
  const bookingsToRemind = await db.booking.findMany({
    where: {
      status: 'CONFIRMED',
      // Check that no reminder has been sent for this booking
      emailLogs: {
        none: {
          type: 'BOOKING_REMINDER',
          status: 'SENT',
        },
      },
    },
    include: {
      teacher: { include: { department: true } },
      timeSlot: true,
    },
  })

  // Filter bookings by time window (need to combine date + startTime)
  const bookingsInWindow = bookingsToRemind.filter((booking) => {
    const slotDate = new Date(booking.timeSlot.date)
    const startTime = new Date(booking.timeSlot.startTime)

    // Combine date and time
    const appointmentTime = new Date(
      slotDate.getFullYear(),
      slotDate.getMonth(),
      slotDate.getDate(),
      startTime.getHours(),
      startTime.getMinutes(),
      0
    )

    return appointmentTime >= minTime && appointmentTime <= maxTime
  })

  if (bookingsInWindow.length === 0) {
    return c.json({ message: 'No reminders to send', sent: 0 })
  }

  const emailSettings = await getEmailSettings()
  const results: { bookingId: string; success: boolean; error?: string }[] = []

  for (const booking of bookingsInWindow) {
    const slotDate = new Date(booking.timeSlot.date)
    const startTime = new Date(booking.timeSlot.startTime)
    const appointmentTime = new Date(
      slotDate.getFullYear(),
      slotDate.getMonth(),
      slotDate.getDate(),
      startTime.getHours(),
      startTime.getMinutes(),
      0
    )
    const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    try {
      // Send the reminder email
      await sendBookingReminder(booking, hoursUntilAppointment, emailSettings)

      // Log successful send
      await db.emailLog.create({
        data: {
          type: 'BOOKING_REMINDER',
          recipient: booking.companyEmail,
          subject: `Terminerinnerung - Tag der Betriebe`,
          status: 'SENT',
          bookingId: booking.id,
        },
      })

      results.push({ bookingId: booking.id, success: true })
    } catch (error) {
      console.error(`Failed to send reminder for booking ${booking.id}:`, error)

      // Log failed attempt
      await db.emailLog.create({
        data: {
          type: 'BOOKING_REMINDER',
          recipient: booking.companyEmail,
          subject: `Terminerinnerung - Tag der Betriebe`,
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
          bookingId: booking.id,
        },
      })

      results.push({
        bookingId: booking.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const sent = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  return c.json({
    message: `Processed ${results.length} reminders`,
    sent,
    failed,
    results,
  })
})

// GET /api/cron/reminders/status - Check reminder system status
cronRouter.get('/reminders/status', async (c) => {
  if (!verifyCronSecret(c)) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const [sendReminder, emailEnabled, reminderHours] = await Promise.all([
    getSettingBoolean('send_reminder'),
    getSettingBoolean('email_notifications'),
    getSettingNumber('reminder_hours_before'),
  ])

  // Count pending reminders
  const now = new Date()
  const reminderWindow = new Date(now.getTime() + reminderHours * 60 * 60 * 1000)

  const pendingReminders = await db.booking.count({
    where: {
      status: 'CONFIRMED',
      emailLogs: {
        none: {
          type: 'BOOKING_REMINDER',
          status: 'SENT',
        },
      },
      timeSlot: {
        date: {
          gte: now,
          lte: reminderWindow,
        },
      },
    },
  })

  // Recent reminder stats
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const [sentCount, failedCount] = await Promise.all([
    db.emailLog.count({
      where: {
        type: 'BOOKING_REMINDER',
        status: 'SENT',
        sentAt: { gte: last24Hours },
      },
    }),
    db.emailLog.count({
      where: {
        type: 'BOOKING_REMINDER',
        status: 'FAILED',
        sentAt: { gte: last24Hours },
      },
    }),
  ])

  return c.json({
    enabled: sendReminder && emailEnabled,
    settings: {
      sendReminder,
      emailEnabled,
      reminderHours,
    },
    stats: {
      pendingReminders,
      last24Hours: {
        sent: sentCount,
        failed: failedCount,
      },
    },
  })
})
