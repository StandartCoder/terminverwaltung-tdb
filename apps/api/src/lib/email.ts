import type { Booking, Teacher, TimeSlot } from '@terminverwaltung/database'
import { createTransport } from 'nodemailer'
import { formatDate, formatTime } from './utils'

const transporter = createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT) || 1025,
  secure: false,
})

// Booking now contains company info directly (no separate Company entity)
type BookingWithRelations = Booking & {
  teacher: Teacher & { department: { name: string; shortCode: string } }
  timeSlot: TimeSlot
}

export async function sendBookingConfirmation(booking: BookingWithRelations): Promise<void> {
  const { teacher, timeSlot, cancellationCode, companyName, companyEmail, contactName } = booking

  const cancellationUrl = `${process.env.PUBLIC_URL || 'http://localhost:3000'}/stornieren?code=${cancellationCode}`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 10px;">
        Terminbestätigung - Tag der Betriebe
      </h1>
      
      <p>Sehr geehrte/r ${contactName || companyName},</p>
      
      <p>Ihr Termin wurde erfolgreich gebucht.</p>
      
      <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin-top: 0; color: #2d3748;">Termindetails</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #718096;">Datum:</td>
            <td style="padding: 8px 0; font-weight: bold;">${formatDate(timeSlot.date)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #718096;">Uhrzeit:</td>
            <td style="padding: 8px 0; font-weight: bold;">${formatTime(timeSlot.startTime)} - ${formatTime(timeSlot.endTime)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #718096;">Lehrkraft:</td>
            <td style="padding: 8px 0; font-weight: bold;">${teacher.firstName} ${teacher.lastName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #718096;">Fachbereich:</td>
            <td style="padding: 8px 0; font-weight: bold;">${teacher.department.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #718096;">Raum:</td>
            <td style="padding: 8px 0; font-weight: bold;">${teacher.room || 'Wird noch bekannt gegeben'}</td>
          </tr>
        </table>
      </div>
      
      <div style="background: #fff5f5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e53e3e;">
        <p style="margin: 0; color: #742a2a;">
          <strong>Termin stornieren?</strong><br>
          Falls Sie den Termin nicht wahrnehmen können, stornieren Sie bitte rechtzeitig:<br>
          <a href="${cancellationUrl}" style="color: #e53e3e;">Termin stornieren</a>
        </p>
      </div>
      
      <p style="color: #718096; font-size: 14px;">
        Bei Fragen wenden Sie sich bitte an das Sekretariat.<br>
        OSZ Teltow
      </p>
    </div>
  `

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@osz-teltow.de',
    to: companyEmail,
    subject: `Terminbestätigung - Tag der Betriebe - ${formatDate(timeSlot.date)}`,
    html,
  })
}

export async function sendBookingCancellation(booking: BookingWithRelations): Promise<void> {
  const { teacher, timeSlot, companyName, companyEmail, contactName } = booking

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #742a2a; border-bottom: 2px solid #e53e3e; padding-bottom: 10px;">
        Stornierungsbestätigung - Tag der Betriebe
      </h1>
      
      <p>Sehr geehrte/r ${contactName || companyName},</p>
      
      <p>Ihr Termin wurde erfolgreich storniert.</p>
      
      <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin-top: 0; color: #2d3748;">Stornierter Termin</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #718096;">Datum:</td>
            <td style="padding: 8px 0;">${formatDate(timeSlot.date)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #718096;">Uhrzeit:</td>
            <td style="padding: 8px 0;">${formatTime(timeSlot.startTime)} - ${formatTime(timeSlot.endTime)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #718096;">Lehrkraft:</td>
            <td style="padding: 8px 0;">${teacher.firstName} ${teacher.lastName}</td>
          </tr>
        </table>
      </div>
      
      <p>Sie können jederzeit einen neuen Termin buchen unter:<br>
      <a href="${process.env.PUBLIC_URL || 'http://localhost:3000'}" style="color: #3182ce;">Tag der Betriebe - Terminbuchung</a></p>
      
      <p style="color: #718096; font-size: 14px;">
        OSZ Teltow
      </p>
    </div>
  `

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@osz-teltow.de',
    to: companyEmail,
    subject: `Stornierungsbestätigung - Tag der Betriebe`,
    html,
  })
}
