import { createHash } from 'crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

async function main() {
  console.log('Seeding database for Tag der Betriebe...')

  // Create Departments
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { shortCode: 'IT' },
      update: {},
      create: {
        name: 'Informatik',
        shortCode: 'IT',
        color: '#3B82F6',
      },
    }),
    prisma.department.upsert({
      where: { shortCode: 'WI' },
      update: {},
      create: {
        name: 'Wirtschaft',
        shortCode: 'WI',
        color: '#10B981',
      },
    }),
    prisma.department.upsert({
      where: { shortCode: 'GE' },
      update: {},
      create: {
        name: 'Gesundheit',
        shortCode: 'GE',
        color: '#F59E0B',
      },
    }),
  ])
  console.log(`Created ${departments.length} departments`)

  // Create Admin Teacher
  const adminPassword = hashPassword('admin123')
  const admin = await prisma.teacher.upsert({
    where: { email: 'admin@osz-teltow.de' },
    update: {},
    create: {
      email: 'admin@osz-teltow.de',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      isAdmin: true,
      departmentId: departments[0].id,
      room: 'A101',
      mustChangePassword: false,
    },
  })
  console.log(`Created admin: ${admin.email}`)

  // Create Sample Teachers
  const teachers = await Promise.all([
    prisma.teacher.upsert({
      where: { email: 'mueller@osz-teltow.de' },
      update: {},
      create: {
        email: 'mueller@osz-teltow.de',
        passwordHash: hashPassword('lehrer123'),
        firstName: 'Thomas',
        lastName: 'Müller',
        departmentId: departments[0].id,
        room: 'B205',
        mustChangePassword: false,
      },
    }),
    prisma.teacher.upsert({
      where: { email: 'schmidt@osz-teltow.de' },
      update: {},
      create: {
        email: 'schmidt@osz-teltow.de',
        passwordHash: hashPassword('lehrer123'),
        firstName: 'Anna',
        lastName: 'Schmidt',
        departmentId: departments[0].id,
        room: 'B207',
        mustChangePassword: false,
      },
    }),
    prisma.teacher.upsert({
      where: { email: 'weber@osz-teltow.de' },
      update: {},
      create: {
        email: 'weber@osz-teltow.de',
        passwordHash: hashPassword('lehrer123'),
        firstName: 'Michael',
        lastName: 'Weber',
        departmentId: departments[1].id,
        room: 'C110',
        mustChangePassword: false,
      },
    }),
  ])
  console.log(`Created ${teachers.length} teachers`)

  // Create Event
  const event = await prisma.event.upsert({
    where: { id: 'tdb-2025' },
    update: {},
    create: {
      id: 'tdb-2025',
      name: 'Tag der Betriebe 2025',
      description: 'Jährlicher Austausch zwischen Schule und Ausbildungsbetrieben',
      startDate: new Date('2025-01-28'),
      endDate: new Date('2025-01-29'),
      bookingOpenAt: new Date('2025-01-10'),
      bookingCloseAt: new Date('2025-01-27'),
      defaultSlotLength: 20,
      isActive: true,
    },
  })
  console.log(`Created event: ${event.name}`)

  // Create TimeSlots for each teacher (Tuesday & Wednesday)
  const eventDates = [new Date('2025-01-28'), new Date('2025-01-29')]
  const slotTimes = [
    { start: '08:00', end: '08:20' },
    { start: '08:20', end: '08:40' },
    { start: '08:40', end: '09:00' },
    { start: '09:00', end: '09:20' },
    { start: '09:20', end: '09:40' },
    { start: '09:40', end: '10:00' },
    { start: '10:20', end: '10:40' },
    { start: '10:40', end: '11:00' },
    { start: '11:00', end: '11:20' },
    { start: '11:20', end: '11:40' },
    { start: '11:40', end: '12:00' },
  ]

  let slotCount = 0
  for (const teacher of [admin, ...teachers]) {
    for (const date of eventDates) {
      for (const slot of slotTimes) {
        await prisma.timeSlot.upsert({
          where: {
            teacherId_date_startTime: {
              teacherId: teacher.id,
              date: date,
              startTime: new Date(`1970-01-01T${slot.start}:00.000Z`),
            },
          },
          update: {},
          create: {
            teacherId: teacher.id,
            date: date,
            startTime: new Date(`1970-01-01T${slot.start}:00.000Z`),
            endTime: new Date(`1970-01-01T${slot.end}:00.000Z`),
            status: 'AVAILABLE',
          },
        })
        slotCount++
      }
    }
  }
  console.log(`Created ${slotCount} time slots`)

  // Create Default Settings
  const settings = [
    { key: 'school_name', value: 'OSZ Teltow', description: 'Name der Schule' },
    { key: 'school_email', value: 'info@osz-teltow.de', description: 'E-Mail der Schule' },
    { key: 'booking_enabled', value: 'true', description: 'Buchungen aktiviert' },
    { key: 'email_notifications', value: 'true', description: 'E-Mail Benachrichtigungen aktiv' },
    { key: 'slot_duration_minutes', value: '20', description: 'Standard Terminlänge in Minuten' },
    {
      key: 'large_company_threshold',
      value: '5',
      description: 'Ab dieser Azubi-Anzahl: Sondertermine',
    },
  ]

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    })
  }
  console.log(`Created ${settings.length} settings`)

  console.log('')
  console.log('Seeding completed!')
  console.log('')
  console.log('Login credentials:')
  console.log('  Admin: admin@osz-teltow.de / admin123')
  console.log('  Teacher: mueller@osz-teltow.de / lehrer123')
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
