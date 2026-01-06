/**
 * Test Factories
 *
 * Create test data with sensible defaults. All factories use the real database.
 */
import { hashPassword, generateTokenPair } from '@terminverwaltung/auth'
import type { Department, Teacher, TimeSlot, Booking, Event } from '@terminverwaltung/database'
import { parseDateString, parseTimeString } from '@terminverwaltung/shared'
import { invalidateSettingsCache } from '../../services/settings'
import { testDb } from './setup'

// Counter for unique values
let counter = 0
function uniqueId(): number {
  return ++counter
}

// Reset counter between test files
export function resetCounter(): void {
  counter = 0
}

// =============================================================================
// DEPARTMENT FACTORY
// =============================================================================

export interface CreateDepartmentOptions {
  name?: string
  shortCode?: string
  color?: string
}

export async function createDepartment(options: CreateDepartmentOptions = {}): Promise<Department> {
  const id = uniqueId()
  return testDb.department.create({
    data: {
      name: options.name ?? `Department ${id}`,
      shortCode: options.shortCode ?? `D${id}`,
      color: options.color ?? '#3B82F6',
    },
  })
}

// =============================================================================
// TEACHER FACTORY
// =============================================================================

export interface CreateTeacherOptions {
  email?: string
  password?: string
  firstName?: string
  lastName?: string
  room?: string
  isAdmin?: boolean
  isActive?: boolean
  mustChangePassword?: boolean
  departmentId?: string
}

export interface TeacherWithAuth {
  teacher: Teacher
  accessToken: string
  refreshToken: string
  password: string
}

export async function createTeacher(options: CreateTeacherOptions = {}): Promise<Teacher> {
  const id = uniqueId()
  const password = options.password ?? 'testpassword123'
  const passwordHash = await hashPassword(password)

  return testDb.teacher.create({
    data: {
      email: options.email ?? `teacher${id}@test.de`,
      passwordHash,
      firstName: options.firstName ?? `First${id}`,
      lastName: options.lastName ?? `Last${id}`,
      room: options.room ?? `R${id}`,
      isAdmin: options.isAdmin ?? false,
      isActive: options.isActive ?? true,
      mustChangePassword: options.mustChangePassword ?? false,
      departmentId: options.departmentId ?? null,
    },
  })
}

export async function createTeacherWithAuth(
  options: CreateTeacherOptions = {}
): Promise<TeacherWithAuth> {
  const password = options.password ?? 'testpassword123'
  const teacher = await createTeacher({ ...options, password })

  const tokens = generateTokenPair({
    sub: teacher.id,
    email: teacher.email,
    isAdmin: teacher.isAdmin,
  })

  return {
    teacher,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    password,
  }
}

export async function createAdmin(
  options: Omit<CreateTeacherOptions, 'isAdmin'> = {}
): Promise<TeacherWithAuth> {
  return createTeacherWithAuth({ ...options, isAdmin: true })
}

// =============================================================================
// TIMESLOT FACTORY
// =============================================================================

export interface CreateTimeSlotOptions {
  teacherId: string
  date?: string // YYYY-MM-DD
  startTime?: string // HH:MM
  endTime?: string // HH:MM
  status?: 'AVAILABLE' | 'BOOKED' | 'BLOCKED'
}

export async function createTimeSlot(options: CreateTimeSlotOptions): Promise<TimeSlot> {
  const date = options.date ?? '2025-06-15'
  const startTime = options.startTime ?? '09:00'
  const endTime = options.endTime ?? '09:20'

  return testDb.timeSlot.create({
    data: {
      teacherId: options.teacherId,
      date: parseDateString(date),
      startTime: parseTimeString(startTime),
      endTime: parseTimeString(endTime),
      status: options.status ?? 'AVAILABLE',
    },
  })
}

export async function createMultipleTimeSlots(
  teacherId: string,
  date: string,
  count: number,
  startHour = 9
): Promise<TimeSlot[]> {
  const slots: TimeSlot[] = []
  for (let i = 0; i < count; i++) {
    const hour = startHour + Math.floor((i * 20) / 60)
    const minute = (i * 20) % 60
    const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    const endMinute = minute + 20
    const endHour = hour + Math.floor(endMinute / 60)
    const endTime = `${endHour.toString().padStart(2, '0')}:${(endMinute % 60).toString().padStart(2, '0')}`

    const slot = await createTimeSlot({
      teacherId,
      date,
      startTime,
      endTime,
    })
    slots.push(slot)
  }
  return slots
}

// =============================================================================
// BOOKING FACTORY
// =============================================================================

export interface CreateBookingOptions {
  timeSlotId: string
  teacherId: string
  companyName?: string
  companyEmail?: string
  companyPhone?: string
  contactName?: string
  studentCount?: number
  students?: { name: string; class: string }[]
  status?: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
}

export async function createBooking(options: CreateBookingOptions): Promise<Booking> {
  const id = uniqueId()

  // Update the timeslot status
  await testDb.timeSlot.update({
    where: { id: options.timeSlotId },
    data: { status: 'BOOKED' },
  })

  return testDb.booking.create({
    data: {
      timeSlotId: options.timeSlotId,
      teacherId: options.teacherId,
      companyName: options.companyName ?? `Company ${id}`,
      companyEmail: options.companyEmail ?? `company${id}@test.de`,
      companyPhone: options.companyPhone ?? null,
      contactName: options.contactName ?? null,
      studentCount: options.studentCount ?? 1,
      students: options.students ? JSON.parse(JSON.stringify(options.students)) : null,
      status: options.status ?? 'CONFIRMED',
    },
  })
}

// =============================================================================
// EVENT FACTORY
// =============================================================================

export interface CreateEventOptions {
  name?: string
  description?: string
  startDate?: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD
  bookingOpenAt?: Date
  bookingCloseAt?: Date
  defaultSlotLength?: number
  isActive?: boolean
}

export async function createEvent(options: CreateEventOptions = {}): Promise<Event> {
  const id = uniqueId()

  return testDb.event.create({
    data: {
      name: options.name ?? `Event ${id}`,
      description: options.description ?? null,
      startDate: parseDateString(options.startDate ?? '2025-06-15'),
      endDate: parseDateString(options.endDate ?? '2025-06-15'),
      bookingOpenAt: options.bookingOpenAt ?? null,
      bookingCloseAt: options.bookingCloseAt ?? null,
      defaultSlotLength: options.defaultSlotLength ?? 20,
      isActive: options.isActive ?? true,
    },
  })
}

// =============================================================================
// SETTING HELPERS
// =============================================================================

export async function setSetting(key: string, value: string): Promise<void> {
  await testDb.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
  // Invalidate the settings cache so the new value is read immediately
  invalidateSettingsCache()
}

export async function setBookingEnabled(enabled: boolean): Promise<void> {
  await setSetting('booking_enabled', enabled.toString())
}

export async function setAllowCancel(enabled: boolean): Promise<void> {
  await setSetting('allow_cancel', enabled.toString())
}

export async function setAllowRebook(enabled: boolean): Promise<void> {
  await setSetting('allow_rebook', enabled.toString())
}

export async function setMaxBookingsPerCompany(max: number): Promise<void> {
  await setSetting('max_bookings_per_company', max.toString())
}

export async function setBookingNoticeHours(hours: number): Promise<void> {
  await setSetting('booking_notice_hours', hours.toString())
}

export async function setCancelNoticeHours(hours: number): Promise<void> {
  await setSetting('cancel_notice_hours', hours.toString())
}
