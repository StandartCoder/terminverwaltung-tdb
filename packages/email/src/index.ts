export { createEmailTransporter, type EmailTransporter } from './transporter'
export {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendRebookConfirmation,
  sendTeacherBookingNotification,
  sendBookingReminder,
  type BookingWithRelations,
  type EmailSettings,
} from './booking-emails'
