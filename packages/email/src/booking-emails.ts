import type { Booking, Teacher, TimeSlot } from '@terminverwaltung/database'
import { formatDate, formatTime } from '@terminverwaltung/shared'
import { getTransporter, formatFromAddress, getPublicUrl } from './transporter'

export type BookingWithRelations = Booking & {
  teacher: Teacher & { department: { name: string; shortCode: string } | null }
  timeSlot: TimeSlot
}

export interface EmailSettings {
  schoolName?: string
  schoolEmail?: string
  schoolPhone?: string
  publicUrl?: string
  emailFromName?: string
  emailReplyTo?: string
}

const DEFAULT_SETTINGS: Required<EmailSettings> = {
  schoolName: 'OSZ Teltow',
  schoolEmail: '',
  schoolPhone: '',
  publicUrl: getPublicUrl(),
  emailFromName: 'OSZ Teltow - Tag der Betriebe',
  emailReplyTo: '',
}

function getSettings(settings?: EmailSettings): Required<EmailSettings> {
  return {
    schoolName: settings?.schoolName || DEFAULT_SETTINGS.schoolName,
    schoolEmail: settings?.schoolEmail || DEFAULT_SETTINGS.schoolEmail,
    schoolPhone: settings?.schoolPhone || DEFAULT_SETTINGS.schoolPhone,
    publicUrl: settings?.publicUrl || DEFAULT_SETTINGS.publicUrl,
    emailFromName: settings?.emailFromName || DEFAULT_SETTINGS.emailFromName,
    emailReplyTo: settings?.emailReplyTo || DEFAULT_SETTINGS.emailReplyTo,
  }
}

function formatContactInfo(settings: Required<EmailSettings>): string {
  const parts: string[] = []
  if (settings.schoolEmail) {
    parts.push(
      `E-Mail: <a href="mailto:${settings.schoolEmail}" style="color: #3182ce;">${settings.schoolEmail}</a>`
    )
  }
  if (settings.schoolPhone) {
    parts.push(`Tel: ${settings.schoolPhone}`)
  }
  if (parts.length === 0) return ''
  return `<br>${parts.join(' | ')}`
}

interface MailOptions {
  to: string
  subject: string
  html: string
}

function buildMailOptions(
  options: MailOptions,
  settings: Required<EmailSettings>
): { from: string; to: string; subject: string; html: string; replyTo?: string } {
  const from = formatFromAddress(settings.emailFromName)
  const result: { from: string; to: string; subject: string; html: string; replyTo?: string } = {
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  }
  if (settings.emailReplyTo && settings.emailReplyTo.trim()) {
    result.replyTo = settings.emailReplyTo
  }
  return result
}

function shouldNotifyParent(booking: BookingWithRelations): boolean {
  return !!(booking.parentEmail && booking.parentEmail.trim() !== '')
}

export async function sendBookingConfirmation(
  booking: BookingWithRelations,
  settings?: EmailSettings
): Promise<void> {
  const { teacher, timeSlot, cancellationCode, companyName, companyEmail, contactName } = booking
  const resolvedSettings = getSettings(settings)
  const { schoolName, publicUrl } = resolvedSettings

  const manageUrl = `${publicUrl}/buchung/verwalten?code=${cancellationCode}`

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
      
      <div style="background: #ebf8ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3182ce;">
        <p style="margin: 0; color: #2c5282;">
          <strong>Buchungscode:</strong> <code style="background: #bee3f8; padding: 2px 6px; border-radius: 4px;">${cancellationCode}</code><br>
          <span style="font-size: 13px;">Bewahren Sie diesen Code auf, um Ihren Termin zu verwalten.</span>
        </p>
      </div>
      
      <div style="background: #fff5f5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e53e3e;">
        <p style="margin: 0; color: #742a2a;">
          <strong>Termin ändern oder stornieren?</strong><br>
          <a href="${manageUrl}" style="color: #e53e3e;">Termin verwalten</a>
        </p>
      </div>
      
      <p style="color: #718096; font-size: 14px;">
        Bei Fragen wenden Sie sich bitte an das Sekretariat.${formatContactInfo(resolvedSettings)}<br>
        ${schoolName}
      </p>
    </div>
  `

  await getTransporter().sendMail(
    buildMailOptions(
      {
        to: companyEmail,
        subject: `Terminbestätigung - Tag der Betriebe - ${formatDate(timeSlot.date)}`,
        html,
      },
      resolvedSettings
    )
  )

  if (shouldNotifyParent(booking)) {
    await sendParentBookingNotification(booking, settings)
  }
}

async function sendParentBookingNotification(
  booking: BookingWithRelations,
  settings?: EmailSettings
): Promise<void> {
  const { teacher, timeSlot, companyName, parentEmail, parentName, studentName } = booking
  const resolvedSettings = getSettings(settings)
  const { schoolName } = resolvedSettings

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
        Bei Fragen wenden Sie sich bitte an das Sekretariat.${formatContactInfo(resolvedSettings)}<br>
        ${schoolName}
      </p>
    </div>
  `

  await getTransporter().sendMail(
    buildMailOptions(
      {
        to: parentEmail!,
        subject: `Terminbenachrichtigung - Tag der Betriebe - ${formatDate(timeSlot.date)}`,
        html,
      },
      resolvedSettings
    )
  )
}

export async function sendBookingCancellation(
  booking: BookingWithRelations,
  settings?: EmailSettings
): Promise<void> {
  const { teacher, timeSlot, companyName, companyEmail, contactName } = booking
  const resolvedSettings = getSettings(settings)
  const { schoolName, publicUrl } = resolvedSettings

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
      <a href="${publicUrl}" style="color: #3182ce;">Tag der Betriebe - Terminbuchung</a></p>
      
      <p style="color: #718096; font-size: 14px;">
        Bei Fragen wenden Sie sich bitte an das Sekretariat.${formatContactInfo(resolvedSettings)}<br>
        ${schoolName}
      </p>
    </div>
  `

  await getTransporter().sendMail(
    buildMailOptions(
      {
        to: companyEmail,
        subject: `Stornierungsbestätigung - Tag der Betriebe`,
        html,
      },
      resolvedSettings
    )
  )

  if (shouldNotifyParent(booking)) {
    await sendParentCancellationNotification(booking, settings)
  }
}

async function sendParentCancellationNotification(
  booking: BookingWithRelations,
  settings?: EmailSettings
): Promise<void> {
  const { teacher, timeSlot, companyName, parentEmail, parentName, studentName } = booking
  const resolvedSettings = getSettings(settings)
  const { schoolName } = resolvedSettings

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
        Bei Fragen wenden Sie sich bitte an den Ausbildungsbetrieb oder das Sekretariat.${formatContactInfo(resolvedSettings)}<br>
        ${schoolName}
      </p>
    </div>
  `

  await getTransporter().sendMail(
    buildMailOptions(
      {
        to: parentEmail!,
        subject: `Terminstornierung - Tag der Betriebe`,
        html,
      },
      resolvedSettings
    )
  )
}

export async function sendRebookConfirmation(
  booking: BookingWithRelations,
  oldTimeSlot: TimeSlot,
  settings?: EmailSettings
): Promise<void> {
  const { teacher, timeSlot, cancellationCode, companyName, companyEmail, contactName } = booking
  const resolvedSettings = getSettings(settings)
  const { schoolName, publicUrl } = resolvedSettings

  const manageUrl = `${publicUrl}/buchung/verwalten?code=${cancellationCode}`

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
          <strong>Neuer Buchungscode:</strong><br>
          <code style="background: #bee3f8; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${cancellationCode}</code>
        </p>
        <p style="margin: 10px 0 0 0; color: #2c5282; font-size: 14px;">
          Falls Sie den Termin erneut ändern oder stornieren möchten:<br>
          <a href="${manageUrl}" style="color: #2b6cb0;">Termin verwalten</a>
        </p>
      </div>
      
      <p style="color: #718096; font-size: 14px;">
        Bei Fragen wenden Sie sich bitte an das Sekretariat.${formatContactInfo(resolvedSettings)}<br>
        ${schoolName}
      </p>
    </div>
  `

  await getTransporter().sendMail(
    buildMailOptions(
      {
        to: companyEmail,
        subject: `Umbuchungsbestätigung - Tag der Betriebe - ${formatDate(timeSlot.date)}`,
        html,
      },
      resolvedSettings
    )
  )

  if (shouldNotifyParent(booking)) {
    await sendParentRebookNotification(booking, oldTimeSlot, settings)
  }
}

async function sendParentRebookNotification(
  booking: BookingWithRelations,
  oldTimeSlot: TimeSlot,
  settings?: EmailSettings
): Promise<void> {
  const { teacher, timeSlot, companyName, parentEmail, parentName, studentName } = booking
  const resolvedSettings = getSettings(settings)
  const { schoolName } = resolvedSettings

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
        Bei Fragen wenden Sie sich bitte an das Sekretariat.${formatContactInfo(resolvedSettings)}<br>
        ${schoolName}
      </p>
    </div>
  `

  await getTransporter().sendMail(
    buildMailOptions(
      {
        to: parentEmail!,
        subject: `Terminänderung - Tag der Betriebe - ${formatDate(timeSlot.date)}`,
        html,
      },
      resolvedSettings
    )
  )
}

export async function sendTeacherBookingNotification(
  booking: BookingWithRelations,
  teacherEmail: string,
  settings?: EmailSettings
): Promise<void> {
  const { teacher, timeSlot, companyName, contactName, studentName, studentClass, notes } = booking
  const resolvedSettings = getSettings(settings)
  const { schoolName } = resolvedSettings

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 10px;">
        Neue Buchung - Tag der Betriebe
      </h1>
      
      <p>Guten Tag ${teacher.firstName} ${teacher.lastName},</p>
      
      <p>Ein neuer Termin wurde für Sie gebucht.</p>
      
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
        </table>
      </div>
      
      <div style="background: #ebf8ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3182ce;">
        <h2 style="margin-top: 0; color: #2c5282;">Betrieb</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #2c5282;">Firmenname:</td>
            <td style="padding: 8px 0; font-weight: bold;">${companyName}</td>
          </tr>
          ${
            contactName
              ? `
          <tr>
            <td style="padding: 8px 0; color: #2c5282;">Ansprechpartner:</td>
            <td style="padding: 8px 0;">${contactName}</td>
          </tr>
          `
              : ''
          }
          ${
            studentName
              ? `
          <tr>
            <td style="padding: 8px 0; color: #2c5282;">Auszubildende/r:</td>
            <td style="padding: 8px 0;">${studentName}${studentClass ? ` (${studentClass})` : ''}</td>
          </tr>
          `
              : ''
          }
          ${
            notes
              ? `
          <tr>
            <td style="padding: 8px 0; color: #2c5282;">Anmerkungen:</td>
            <td style="padding: 8px 0;">${notes}</td>
          </tr>
          `
              : ''
          }
        </table>
      </div>
      
      <p style="color: #718096; font-size: 14px;">
        ${schoolName}
      </p>
    </div>
  `

  await getTransporter().sendMail(
    buildMailOptions(
      {
        to: teacherEmail,
        subject: `Neue Buchung - ${formatDate(timeSlot.date)} ${formatTime(timeSlot.startTime)}`,
        html,
      },
      resolvedSettings
    )
  )
}

export async function sendBookingReminder(
  booking: BookingWithRelations,
  hoursUntilAppointment: number,
  settings?: EmailSettings
): Promise<void> {
  const { teacher, timeSlot, cancellationCode, companyName, companyEmail, contactName } = booking
  const resolvedSettings = getSettings(settings)
  const { schoolName, publicUrl } = resolvedSettings

  const manageUrl = `${publicUrl}/buchung/verwalten?code=${cancellationCode}`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #d69e2e; border-bottom: 2px solid #ecc94b; padding-bottom: 10px;">
        Terminerinnerung - Tag der Betriebe
      </h1>
      
      <p>Sehr geehrte/r ${contactName || companyName},</p>
      
      <p>
        Wir möchten Sie an Ihren Termin in <strong>${Math.round(hoursUntilAppointment)} Stunden</strong> erinnern.
      </p>
      
      <div style="background: #fffff0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ecc94b;">
        <h2 style="margin-top: 0; color: #744210;">Termindetails</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #744210;">Datum:</td>
            <td style="padding: 8px 0; font-weight: bold;">${formatDate(timeSlot.date)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #744210;">Uhrzeit:</td>
            <td style="padding: 8px 0; font-weight: bold;">${formatTime(timeSlot.startTime)} - ${formatTime(timeSlot.endTime)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #744210;">Lehrkraft:</td>
            <td style="padding: 8px 0; font-weight: bold;">${teacher.firstName} ${teacher.lastName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #744210;">Fachbereich:</td>
            <td style="padding: 8px 0; font-weight: bold;">${teacher.department?.name || 'Nicht zugeordnet'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #744210;">Raum:</td>
            <td style="padding: 8px 0; font-weight: bold;">${teacher.room || 'Wird noch bekannt gegeben'}</td>
          </tr>
        </table>
      </div>
      
      <div style="background: #ebf8ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3182ce;">
        <p style="margin: 0; color: #2c5282;">
          <strong>Buchungscode:</strong> <code style="background: #bee3f8; padding: 2px 6px; border-radius: 4px;">${cancellationCode}</code><br>
          <span style="font-size: 13px;">Falls Sie den Termin ändern oder stornieren möchten:</span><br>
          <a href="${manageUrl}" style="color: #3182ce;">Termin verwalten</a>
        </p>
      </div>
      
      <p style="color: #718096; font-size: 14px;">
        Bei Fragen wenden Sie sich bitte an das Sekretariat.${formatContactInfo(resolvedSettings)}<br>
        ${schoolName}
      </p>
    </div>
  `

  await getTransporter().sendMail(
    buildMailOptions(
      {
        to: companyEmail,
        subject: `Terminerinnerung - Tag der Betriebe - ${formatDate(timeSlot.date)}`,
        html,
      },
      resolvedSettings
    )
  )

  // Also notify parent if they're registered
  if (shouldNotifyParent(booking)) {
    await sendParentReminder(booking, hoursUntilAppointment, settings)
  }
}

async function sendParentReminder(
  booking: BookingWithRelations,
  hoursUntilAppointment: number,
  settings?: EmailSettings
): Promise<void> {
  const { teacher, timeSlot, companyName, parentEmail, parentName, studentName } = booking
  const resolvedSettings = getSettings(settings)
  const { schoolName } = resolvedSettings

  const studentInfo = studentName ? `Ihres Kindes ${studentName}` : 'Ihres Kindes'

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #d69e2e; border-bottom: 2px solid #ecc94b; padding-bottom: 10px;">
        Terminerinnerung - Tag der Betriebe
      </h1>
      
      <p>Sehr geehrte/r ${parentName || 'Elternteil'},</p>
      
      <p>
        Wir möchten Sie an den Gesprächstermin bezüglich ${studentInfo} in 
        <strong>${Math.round(hoursUntilAppointment)} Stunden</strong> erinnern.
      </p>
      
      <div style="background: #fffff0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ecc94b;">
        <h2 style="margin-top: 0; color: #744210;">Termindetails</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #744210;">Datum:</td>
            <td style="padding: 8px 0; font-weight: bold;">${formatDate(timeSlot.date)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #744210;">Uhrzeit:</td>
            <td style="padding: 8px 0; font-weight: bold;">${formatTime(timeSlot.startTime)} - ${formatTime(timeSlot.endTime)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #744210;">Lehrkraft:</td>
            <td style="padding: 8px 0; font-weight: bold;">${teacher.firstName} ${teacher.lastName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #744210;">Fachbereich:</td>
            <td style="padding: 8px 0; font-weight: bold;">${teacher.department?.name || 'Nicht zugeordnet'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #744210;">Raum:</td>
            <td style="padding: 8px 0; font-weight: bold;">${teacher.room || 'Wird noch bekannt gegeben'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #744210;">Betrieb:</td>
            <td style="padding: 8px 0; font-weight: bold;">${companyName}</td>
          </tr>
        </table>
      </div>
      
      <p style="color: #718096; font-size: 14px;">
        Bei Fragen wenden Sie sich bitte an den Ausbildungsbetrieb oder das Sekretariat.${formatContactInfo(resolvedSettings)}<br>
        ${schoolName}
      </p>
    </div>
  `

  await getTransporter().sendMail(
    buildMailOptions(
      {
        to: parentEmail!,
        subject: `Terminerinnerung - Tag der Betriebe - ${formatDate(timeSlot.date)}`,
        html,
      },
      resolvedSettings
    )
  )
}
