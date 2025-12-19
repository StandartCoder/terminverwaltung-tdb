import { db } from '@terminverwaltung/database'
import {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendRebookConfirmation,
  sendTeacherBookingNotification,
  type BookingWithRelations,
  type EmailSettings,
} from '@terminverwaltung/email'
import type { TimeSlot } from '@terminverwaltung/database'
import { formatDate, formatTime } from '@terminverwaltung/shared'

type EmailType =
  | 'BOOKING_CONFIRMATION'
  | 'BOOKING_CANCELLATION'
  | 'BOOKING_REMINDER'
  | 'BOOKING_UPDATE'

export interface EmailResult {
  success: boolean
  error?: string
}

async function logEmail(params: {
  type: EmailType
  recipient: string
  subject: string
  bookingId: string
  status: 'SENT' | 'FAILED'
  error?: string
}): Promise<void> {
  try {
    await db.emailLog.create({
      data: {
        type: params.type,
        recipient: params.recipient,
        subject: params.subject,
        status: params.status,
        error: params.error,
        bookingId: params.bookingId,
      },
    })
  } catch (logError) {
    console.error('Failed to log email:', logError)
  }
}

export async function sendConfirmationWithLogging(
  booking: BookingWithRelations,
  settings: EmailSettings
): Promise<EmailResult> {
  const subject = `Terminbestätigung - Tag der Betriebe - ${formatDate(booking.timeSlot.date)}`

  try {
    await sendBookingConfirmation(booking, settings)
    await logEmail({
      type: 'BOOKING_CONFIRMATION',
      recipient: booking.companyEmail,
      subject,
      bookingId: booking.id,
      status: 'SENT',
    })
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Failed to send confirmation email:', error)
    await logEmail({
      type: 'BOOKING_CONFIRMATION',
      recipient: booking.companyEmail,
      subject,
      bookingId: booking.id,
      status: 'FAILED',
      error: errorMessage,
    })
    return { success: false, error: errorMessage }
  }
}

export async function sendCancellationWithLogging(
  booking: BookingWithRelations,
  settings: EmailSettings
): Promise<EmailResult> {
  const subject = 'Stornierungsbestätigung - Tag der Betriebe'

  try {
    await sendBookingCancellation(booking, settings)
    await logEmail({
      type: 'BOOKING_CANCELLATION',
      recipient: booking.companyEmail,
      subject,
      bookingId: booking.id,
      status: 'SENT',
    })
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Failed to send cancellation email:', error)
    await logEmail({
      type: 'BOOKING_CANCELLATION',
      recipient: booking.companyEmail,
      subject,
      bookingId: booking.id,
      status: 'FAILED',
      error: errorMessage,
    })
    return { success: false, error: errorMessage }
  }
}

export async function sendRebookWithLogging(
  booking: BookingWithRelations,
  oldTimeSlot: TimeSlot,
  settings: EmailSettings
): Promise<EmailResult> {
  const subject = `Umbuchungsbestätigung - Tag der Betriebe - ${formatDate(booking.timeSlot.date)}`

  try {
    await sendRebookConfirmation(booking, oldTimeSlot, settings)
    await logEmail({
      type: 'BOOKING_UPDATE',
      recipient: booking.companyEmail,
      subject,
      bookingId: booking.id,
      status: 'SENT',
    })
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Failed to send rebook confirmation email:', error)
    await logEmail({
      type: 'BOOKING_UPDATE',
      recipient: booking.companyEmail,
      subject,
      bookingId: booking.id,
      status: 'FAILED',
      error: errorMessage,
    })
    return { success: false, error: errorMessage }
  }
}

export async function sendTeacherNotificationWithLogging(
  booking: BookingWithRelations,
  teacherEmail: string,
  settings: EmailSettings
): Promise<EmailResult> {
  const subject = `Neue Buchung - ${formatDate(booking.timeSlot.date)} ${formatTime(booking.timeSlot.startTime)}`

  try {
    await sendTeacherBookingNotification(booking, teacherEmail, settings)
    // Use BOOKING_UPDATE for teacher notifications since we don't have a specific type
    await logEmail({
      type: 'BOOKING_UPDATE',
      recipient: teacherEmail,
      subject,
      bookingId: booking.id,
      status: 'SENT',
    })
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Failed to send teacher notification email:', error)
    await logEmail({
      type: 'BOOKING_UPDATE',
      recipient: teacherEmail,
      subject,
      bookingId: booking.id,
      status: 'FAILED',
      error: errorMessage,
    })
    return { success: false, error: errorMessage }
  }
}
