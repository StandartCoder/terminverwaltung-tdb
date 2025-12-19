import { PrismaClient } from '@prisma/client'
import { hashPassword } from '@terminverwaltung/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database for Tag der Betriebe...')

  // Create Departments
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { shortCode: 'IT' },
      update: {},
      create: {
        name: 'Fachinformatiker/in',
        shortCode: 'IT',
        color: '#3B82F6',
      },
    }),
    prisma.department.upsert({
      where: { shortCode: 'KFZ' },
      update: {},
      create: {
        name: 'KFZ-Mechatroniker/in',
        shortCode: 'KFZ',
        color: '#EF4444',
      },
    }),
    prisma.department.upsert({
      where: { shortCode: 'ET' },
      update: {},
      create: {
        name: 'Elektrotechniker/in',
        shortCode: 'ET',
        color: '#10B981',
      },
    }),
    prisma.department.upsert({
      where: { shortCode: 'MG' },
      update: {},
      create: {
        name: 'Mediengestalter/in',
        shortCode: 'MG',
        color: '#F59E0B',
      },
    }),
    prisma.department.upsert({
      where: { shortCode: 'AN' },
      update: {},
      create: {
        name: 'Anlagenmechaniker/in',
        shortCode: 'AN',
        color: '#8B5CF6',
      },
    }),
    prisma.department.upsert({
      where: { shortCode: 'WB' },
      update: {},
      create: {
        name: 'Wasserbauer/in',
        shortCode: 'WB',
        color: '#1479b8',
      },
    }),
  ])
  console.log(`Created ${departments.length} departments`)

  // Create Admin (no department - admins are system-wide)
  const adminPasswordHash = await hashPassword('admin123')
  const admin = await prisma.teacher.upsert({
    where: { email: 'admin@osz-teltow.de' },
    update: {},
    create: {
      email: 'admin@osz-teltow.de',
      passwordHash: adminPasswordHash,
      firstName: 'Admin',
      lastName: 'User',
      isAdmin: true,
      mustChangePassword: true,
    },
  })
  console.log(`Created admin: ${admin.email}`)

  // Create Default Settings (all settings from apps/api/src/services/settings.ts DEFAULTS)
  const settings = [
    // General
    { key: 'school_name', value: 'OSZ Teltow', description: 'Name der Schule' },
    { key: 'school_email', value: 'info@osz-teltow.de', description: 'E-Mail der Schule' },
    { key: 'school_phone', value: '', description: 'Telefonnummer der Schule' },
    {
      key: 'public_url',
      value: 'http://localhost:3000',
      description: 'Öffentliche URL der Anwendung',
    },

    // Booking
    { key: 'booking_enabled', value: 'true', description: 'Buchungen aktiviert' },
    { key: 'allow_rebook', value: 'true', description: 'Umbuchungen erlauben' },
    { key: 'allow_cancel', value: 'true', description: 'Stornierungen erlauben' },
    {
      key: 'max_bookings_per_company',
      value: '0',
      description: 'Max. Buchungen pro Firma (0 = unbegrenzt)',
    },
    {
      key: 'booking_notice_hours',
      value: '0',
      description: 'Vorlaufzeit für Buchungen in Stunden (0 = keine)',
    },
    {
      key: 'cancel_notice_hours',
      value: '0',
      description: 'Vorlaufzeit für Stornierungen in Stunden (0 = keine)',
    },

    // Timeslots
    { key: 'slot_duration_minutes', value: '20', description: 'Standard Terminlänge in Minuten' },
    { key: 'slot_buffer_minutes', value: '0', description: 'Puffer zwischen Terminen in Minuten' },
    { key: 'day_start_time', value: '08:00', description: 'Tagesbeginn für Termine' },
    { key: 'day_end_time', value: '18:00', description: 'Tagesende für Termine' },

    // Companies
    {
      key: 'large_company_threshold',
      value: '5',
      description: 'Ab dieser Azubi-Anzahl: Sondertermine',
    },
    { key: 'require_phone', value: 'false', description: 'Telefonnummer bei Buchung erforderlich' },
    {
      key: 'require_contact_name',
      value: 'true',
      description: 'Ansprechpartner bei Buchung erforderlich',
    },
    { key: 'show_student_fields', value: 'true', description: 'Schülerfelder anzeigen' },
    { key: 'show_parent_fields', value: 'true', description: 'Elternfelder anzeigen' },

    // Email
    { key: 'email_notifications', value: 'true', description: 'E-Mail Benachrichtigungen aktiv' },
    {
      key: 'email_from_name',
      value: 'OSZ Teltow - Tag der Betriebe',
      description: 'Absendername für E-Mails',
    },
    { key: 'email_reply_to', value: '', description: 'Antwort-Adresse für E-Mails' },
    { key: 'send_reminder', value: 'false', description: 'Erinnerungs-E-Mails senden' },
    { key: 'reminder_hours_before', value: '24', description: 'Stunden vor Termin für Erinnerung' },
    {
      key: 'notify_teacher_on_booking',
      value: 'false',
      description: 'Lehrer bei neuer Buchung benachrichtigen',
    },

    // Display
    { key: 'event_title', value: 'Tag der Betriebe', description: 'Titel der Veranstaltung' },
    { key: 'welcome_message', value: '', description: 'Begrüßungstext auf der Startseite' },
    { key: 'confirmation_message', value: '', description: 'Text auf der Bestätigungsseite' },
    { key: 'show_room_info', value: 'true', description: 'Rauminformationen anzeigen' },
    { key: 'show_department_colors', value: 'true', description: 'Abteilungsfarben anzeigen' },

    // Security
    { key: 'session_timeout_minutes', value: '60', description: 'Sitzungs-Timeout in Minuten' },
    { key: 'min_password_length', value: '6', description: 'Minimale Passwortlänge' },
    {
      key: 'require_password_change',
      value: 'true',
      description: 'Passwortänderung bei erster Anmeldung erforderlich',
    },
  ]

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    })
  }
  console.log(`Created ${settings.length} settings (all defaults)`)

  console.log('')
  console.log('Seeding completed!')
  console.log('')
  console.log('Login credentials:')
  console.log('  Admin: admin@osz-teltow.de / admin123')
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
