/**
 * Integration Test Setup
 *
 * This setup uses a real PostgreSQL database for testing.
 * Requires: docker compose -f docker-compose.dev.yml up postgres
 *
 * Each test file gets a clean database state via transactions that are rolled back.
 */
import { PrismaClient } from '@terminverwaltung/database'
import { beforeAll, afterAll, beforeEach } from 'vitest'

// Test database client - separate from application client
export const testDb = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/terminverwaltung_test',
    },
  },
  log: ['error'],
})

// Set required environment variables for tests
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-characters-long'
process.env.CRON_SECRET = 'test-cron-secret'
process.env.NODE_ENV = 'test'

/**
 * Clean all tables in correct order (respecting foreign keys)
 */
export async function cleanDatabase(): Promise<void> {
  await testDb.$transaction([
    testDb.emailLog.deleteMany(),
    testDb.booking.deleteMany(),
    testDb.timeSlot.deleteMany(),
    testDb.teacher.deleteMany(),
    testDb.department.deleteMany(),
    testDb.event.deleteMany(),
    testDb.setting.deleteMany(),
  ])
}

/**
 * Seed default settings required for tests
 */
export async function seedDefaultSettings(): Promise<void> {
  const defaultSettings = [
    { key: 'booking_enabled', value: 'true', description: 'Enable booking' },
    { key: 'allow_cancel', value: 'true', description: 'Allow cancellation' },
    { key: 'allow_rebook', value: 'true', description: 'Allow rebooking' },
    { key: 'email_notifications', value: 'false', description: 'Disable emails in tests' },
    { key: 'booking_notice_hours', value: '0', description: 'No notice required' },
    { key: 'cancel_notice_hours', value: '0', description: 'No notice required' },
    { key: 'max_bookings_per_company', value: '0', description: 'No limit' },
    { key: 'require_phone', value: 'false', description: 'Phone not required' },
    { key: 'require_contact_name', value: 'false', description: 'Contact not required' },
    { key: 'slot_duration_minutes', value: '20', description: 'Default slot duration' },
    { key: 'slot_buffer_minutes', value: '0', description: 'No buffer' },
    { key: 'day_start_time', value: '08:00', description: 'Day start' },
    { key: 'day_end_time', value: '18:00', description: 'Day end' },
    { key: 'min_password_length', value: '6', description: 'Minimum password length' },
    { key: 'require_password_change', value: 'false', description: 'No forced password change' },
    { key: 'notify_teacher_on_booking', value: 'false', description: 'No teacher notification' },
  ]

  await testDb.setting.createMany({
    data: defaultSettings,
    skipDuplicates: true,
  })
}

/**
 * Global test setup - run once before all tests
 */
beforeAll(async () => {
  await testDb.$connect()
  await cleanDatabase()
  await seedDefaultSettings()
})

/**
 * Clean up before each test
 */
beforeEach(async () => {
  // Clean data tables but keep settings
  await testDb.$transaction([
    testDb.emailLog.deleteMany(),
    testDb.booking.deleteMany(),
    testDb.timeSlot.deleteMany(),
    testDb.teacher.deleteMany(),
    testDb.department.deleteMany(),
    testDb.event.deleteMany(),
  ])
})

/**
 * Global test teardown
 */
afterAll(async () => {
  await cleanDatabase()
  await testDb.$disconnect()
})
