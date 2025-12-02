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
  teacher: Teacher & { department: { name: string; shortCode: string } | null }
  timeSlot: TimeSlot
}

// Helper to check if parent email should receive notifications
function shouldNotifyParent(booking: BookingWithRelations): boolean {
  return !!(booking.parentEmail && booking.parentEmail.trim() !== '')
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
            <td style="padding: 8px 0; font-weight: bold;">${teacher.department?.name || 'Nicht zugeordnet'}</td>
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

  // Send parent notification if parent email is provided
  if (shouldNotifyParent(booking)) {
    await sendParentBookingNotification(booking)
  }
}

async function sendParentBookingNotification(booking: BookingWithRelations): Promise<void> {
  const { teacher, timeSlot, companyName, parentEmail, parentName, studentName } = booking

  const studentInfo = studentName ? `Ihres Kindes ${studentName}` : 'Ihres Kindes'

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 10px;">
        Terminbenachrichtigung - Tag der Betriebe
      </h1>
      
      <p>Sehr geehrte/r ${parentName || 'Elternteil'},</p>
      
      <p>
        Der Ausbildungsbetrieb <strong>${companyName}</strong> hat einen Gesprächstermin 
        bezüglich ${studentInfo} gebucht. Sie sind herzlich eingeladen, an diesem Gespräch teilzunehmen.
      </p>
      
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
            <td style="padding: 8px 0; font-weight: bold;">${teacher.department?.name || 'Nicht zugeordnet'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #718096;">Raum:</td>
            <td style="padding: 8px 0; font-weight: bold;">${teacher.room || 'Wird noch bekannt gegeben'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #718096;">Betrieb:</td>
            <td style="padding: 8px 0; font-weight: bold;">${companyName}</td>
          </tr>
        </table>
      </div>
      
      <div style="background: #ebf8ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3182ce;">
        <p style="margin: 0; color: #2c5282;">
          <strong>Hinweis:</strong><br>
          Bei Fragen zum Termin wenden Sie sich bitte an den Ausbildungsbetrieb oder das Sekretariat.
          Änderungen am Termin können nur durch den Betrieb vorgenommen werden.
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
    to: parentEmail!,
    subject: `Terminbenachrichtigung - Tag der Betriebe - ${formatDate(timeSlot.date)}`,
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

  // Send parent notification if parent email is provided
  if (shouldNotifyParent(booking)) {
    await sendParentCancellationNotification(booking)
  }
}

async function sendParentCancellationNotification(booking: BookingWithRelations): Promise<void> {
  const { teacher, timeSlot, companyName, parentEmail, parentName, studentName } = booking

  const studentInfo = studentName ? `Ihres Kindes ${studentName}` : 'Ihres Kindes'

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #742a2a; border-bottom: 2px solid #e53e3e; padding-bottom: 10px;">
        Terminstornierung - Tag der Betriebe
      </h1>
      
      <p>Sehr geehrte/r ${parentName || 'Elternteil'},</p>
      
      <p>
        Der Ausbildungsbetrieb <strong>${companyName}</strong> hat den Gesprächstermin 
        bezüglich ${studentInfo} storniert.
      </p>
      
      <div style="background: #fed7d7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e53e3e;">
        <h2 style="margin-top: 0; color: #742a2a;">Stornierter Termin</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #742a2a;">Datum:</td>
            <td style="padding: 8px 0; text-decoration: line-through;">${formatDate(timeSlot.date)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #742a2a;">Uhrzeit:</td>
            <td style="padding: 8px 0; text-decoration: line-through;">${formatTime(timeSlot.startTime)} - ${formatTime(timeSlot.endTime)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #742a2a;">Lehrkraft:</td>
            <td style="padding: 8px 0;">${teacher.firstName} ${teacher.lastName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #742a2a;">Betrieb:</td>
            <td style="padding: 8px 0;">${companyName}</td>
          </tr>
        </table>
      </div>
      
      <p style="color: #718096; font-size: 14px;">
        Bei Fragen wenden Sie sich bitte an den Ausbildungsbetrieb oder das Sekretariat.<br>
        OSZ Teltow
      </p>
    </div>
  `

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@osz-teltow.de',
    to: parentEmail!,
    subject: `Terminstornierung - Tag der Betriebe`,
    html,
  })
}

export async function sendRebookConfirmation(
  booking: BookingWithRelations,
  oldTimeSlot: TimeSlot
): Promise<void> {
  const { teacher, timeSlot, cancellationCode, companyName, companyEmail, contactName } = booking

  const manageUrl = `${process.env.PUBLIC_URL || 'http://localhost:3000'}/stornieren?code=${cancellationCode}`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #2b6cb0; border-bottom: 2px solid #3182ce; padding-bottom: 10px;">
        Umbuchungsbestätigung - Tag der Betriebe
      </h1>
      
      <p>Sehr geehrte/r ${contactName || companyName},</p>
      
      <p>Ihr Termin wurde erfolgreich umgebucht.</p>
      
      <div style="background: #fed7d7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e53e3e;">
        <h3 style="margin-top: 0; color: #742a2a;">Alter Termin (storniert)</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #742a2a;">Datum:</td>
            <td style="padding: 4px 0; text-decoration: line-through;">${formatDate(oldTimeSlot.date)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #742a2a;">Uhrzeit:</td>
            <td style="padding: 4px 0; text-decoration: line-through;">${formatTime(oldTimeSlot.startTime)} - ${formatTime(oldTimeSlot.endTime)}</td>
          </tr>
        </table>
      </div>
      
      <div style="background: #c6f6d5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #38a169;">
        <h2 style="margin-top: 0; color: #276749;">Neuer Termin</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #276749;">Datum:</td>
            <td style="padding: 8px 0; font-weight: bold;">${formatDate(timeSlot.date)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #276749;">Uhrzeit:</td>
            <td style="padding: 8px 0; font-weight: bold;">${formatTime(timeSlot.startTime)} - ${formatTime(timeSlot.endTime)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #276749;">Lehrkraft:</td>
            <td style="padding: 8px 0; font-weight: bold;">${teacher.firstName} ${teacher.lastName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #276749;">Fachbereich:</td>
            <td style="padding: 8px 0; font-weight: bold;">${teacher.department?.name || 'Nicht zugeordnet'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #276749;">Raum:</td>
            <td style="padding: 8px 0; font-weight: bold;">${teacher.room || 'Wird noch bekannt gegeben'}</td>
          </tr>
        </table>
      </div>
      
      <div style="background: #ebf8ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3182ce;">
        <p style="margin: 0; color: #2c5282;">
          <strong>Neuer Stornierungscode:</strong><br>
          <code style="background: #bee3f8; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${cancellationCode}</code>
        </p>
        <p style="margin: 10px 0 0 0; color: #2c5282; font-size: 14px;">
          Falls Sie den Termin erneut stornieren oder umbuchen möchten:<br>
          <a href="${manageUrl}" style="color: #2b6cb0;">Termin verwalten</a>
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
    subject: `Umbuchungsbestätigung - Tag der Betriebe - ${formatDate(timeSlot.date)}`,
    html,
  })

  // Send parent notification if parent email is provided
  if (shouldNotifyParent(booking)) {
    await sendParentRebookNotification(booking, oldTimeSlot)
  }
}

async function sendParentRebookNotification(
  booking: BookingWithRelations,
  oldTimeSlot: TimeSlot
): Promise<void> {
  const { teacher, timeSlot, companyName, parentEmail, parentName, studentName } = booking

  const studentInfo = studentName ? `Ihres Kindes ${studentName}` : 'Ihres Kindes'

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #2b6cb0; border-bottom: 2px solid #3182ce; padding-bottom: 10px;">
        Terminänderung - Tag der Betriebe
      </h1>
      
      <p>Sehr geehrte/r ${parentName || 'Elternteil'},</p>
      
      <p>
        Der Ausbildungsbetrieb <strong>${companyName}</strong> hat den Gesprächstermin 
        bezüglich ${studentInfo} auf einen neuen Zeitpunkt umgebucht.
      </p>
      
      <div style="background: #fed7d7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e53e3e;">
        <h3 style="margin-top: 0; color: #742a2a;">Alter Termin (entfällt)</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #742a2a;">Datum:</td>
            <td style="padding: 4px 0; text-decoration: line-through;">${formatDate(oldTimeSlot.date)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #742a2a;">Uhrzeit:</td>
            <td style="padding: 4px 0; text-decoration: line-through;">${formatTime(oldTimeSlot.startTime)} - ${formatTime(oldTimeSlot.endTime)}</td>
          </tr>
        </table>
      </div>
      
      <div style="background: #c6f6d5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #38a169;">
        <h2 style="margin-top: 0; color: #276749;">Neuer Termin</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #276749;">Datum:</td>
            <td style="padding: 8px 0; font-weight: bold;">${formatDate(timeSlot.date)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #276749;">Uhrzeit:</td>
            <td style="padding: 8px 0; font-weight: bold;">${formatTime(timeSlot.startTime)} - ${formatTime(timeSlot.endTime)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #276749;">Lehrkraft:</td>
            <td style="padding: 8px 0; font-weight: bold;">${teacher.firstName} ${teacher.lastName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #276749;">Fachbereich:</td>
            <td style="padding: 8px 0; font-weight: bold;">${teacher.department?.name || 'Nicht zugeordnet'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #276749;">Raum:</td>
            <td style="padding: 8px 0; font-weight: bold;">${teacher.room || 'Wird noch bekannt gegeben'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #276749;">Betrieb:</td>
            <td style="padding: 8px 0; font-weight: bold;">${companyName}</td>
          </tr>
        </table>
      </div>
      
      <div style="background: #ebf8ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3182ce;">
        <p style="margin: 0; color: #2c5282;">
          <strong>Hinweis:</strong><br>
          Bei Fragen zum neuen Termin wenden Sie sich bitte an den Ausbildungsbetrieb oder das Sekretariat.
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
    to: parentEmail!,
    subject: `Terminänderung - Tag der Betriebe - ${formatDate(timeSlot.date)}`,
    html,
  })
}
