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

  // Create Default Settings
  const settings = [
    { key: 'school_name', value: 'OSZ-Teltow', description: 'Name der Schule' },
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
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
