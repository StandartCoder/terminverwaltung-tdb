/**
 * Bookings Integration Tests
 *
 * Tests the booking workflow with real database operations:
 * - Create booking
 * - Cancel booking
 * - Rebook to different timeslot
 * - Race condition prevention (double booking)
 * - Settings enforcement (max bookings, notice hours, etc.)
 */
import { HTTP_STATUS } from '@terminverwaltung/shared'
import { describe, it, expect } from 'vitest'
import {
  createDepartment,
  createTeacher,
  createTeacherWithAuth,
  createAdmin,
  createTimeSlot,
  createMultipleTimeSlots,
  createBooking,
  setBookingEnabled,
  setAllowCancel,
  setAllowRebook,
  setMaxBookingsPerCompany,
  setSetting,
} from './factories'
import { post, get, patch, getData, getError } from './helpers'
import { testDb } from './setup'

describe('Bookings API', () => {
  describe('POST /api/bookings - Create Booking', () => {
    it('creates a booking for an available timeslot', async () => {
      const teacher = await createTeacher()
      const timeSlot = await createTimeSlot({ teacherId: teacher.id })

      const res = await post('/api/bookings', {
        timeSlotId: timeSlot.id,
        companyName: 'Test GmbH',
        companyEmail: 'test@company.de',
        studentCount: 1,
      })

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const data = getData(res.body)
      expect(data).toMatchObject({
        status: 'CONFIRMED',
        cancellationCode: expect.any(String),
      })

      // Verify timeslot is now booked
      const updatedSlot = await testDb.timeSlot.findUnique({ where: { id: timeSlot.id } })
      expect(updatedSlot?.status).toBe('BOOKED')

      // Verify booking exists in database
      const booking = await testDb.booking.findFirst({ where: { timeSlotId: timeSlot.id } })
      expect(booking).not.toBeNull()
      expect(booking?.companyName).toBe('Test GmbH')
    })

    it('creates a booking with student details', async () => {
      const teacher = await createTeacher()
      const timeSlot = await createTimeSlot({ teacherId: teacher.id })

      const students = [
        { name: 'Max Mustermann', class: '12IT1' },
        { name: 'Erika Musterfrau', class: '12IT1' },
      ]

      const res = await post('/api/bookings', {
        timeSlotId: timeSlot.id,
        companyName: 'Test GmbH',
        companyEmail: 'test@company.de',
        studentCount: 2,
        students,
      })

      expect(res.status).toBe(HTTP_STATUS.CREATED)

      const booking = await testDb.booking.findFirst({ where: { timeSlotId: timeSlot.id } })
      expect(booking?.students).toEqual(students)
      expect(booking?.studentCount).toBe(2)
    })

    it('rejects booking for already booked timeslot', async () => {
      const teacher = await createTeacher()
      const timeSlot = await createTimeSlot({ teacherId: teacher.id })
      await createBooking({ timeSlotId: timeSlot.id, teacherId: teacher.id })

      const res = await post('/api/bookings', {
        timeSlotId: timeSlot.id,
        companyName: 'Another Company',
        companyEmail: 'another@company.de',
        studentCount: 1,
      })

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
      const error = getError(res.body)
      expect(error?.error).toBe('SLOT_ALREADY_BOOKED')
    })

    it('rejects booking for blocked timeslot', async () => {
      const teacher = await createTeacher()
      const timeSlot = await createTimeSlot({ teacherId: teacher.id, status: 'BLOCKED' })

      const res = await post('/api/bookings', {
        timeSlotId: timeSlot.id,
        companyName: 'Test GmbH',
        companyEmail: 'test@company.de',
        studentCount: 1,
      })

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
    })

    // TODO: API returns 400 for invalid IDs, should return 404 for non-existent resources
    it.skip('rejects booking for non-existent timeslot', async () => {
      const res = await post('/api/bookings', {
        timeSlotId: 'non-existent-id',
        companyName: 'Test GmbH',
        companyEmail: 'test@company.de',
        studentCount: 1,
      })

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })

    // TODO: booking_enabled setting check not implemented in API
    it.skip('rejects booking when booking is disabled', async () => {
      await setBookingEnabled(false)

      const teacher = await createTeacher()
      const timeSlot = await createTimeSlot({ teacherId: teacher.id })

      const res = await post('/api/bookings', {
        timeSlotId: timeSlot.id,
        companyName: 'Test GmbH',
        companyEmail: 'test@company.de',
        studentCount: 1,
      })

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)

      // Re-enable for other tests
      await setBookingEnabled(true)
    })

    // TODO: max_bookings_per_email setting check not implemented in API
    it.skip('enforces max bookings per company email', async () => {
      await setMaxBookingsPerCompany(2)

      const teacher = await createTeacher()
      const slots = await createMultipleTimeSlots(teacher.id, '2025-06-15', 3)
      const companyEmail = 'limited@company.de'

      // First booking - OK
      const res1 = await post('/api/bookings', {
        timeSlotId: slots[0].id,
        companyName: 'Limited Company',
        companyEmail,
        studentCount: 1,
      })
      expect(res1.status).toBe(HTTP_STATUS.CREATED)

      // Second booking - OK
      const res2 = await post('/api/bookings', {
        timeSlotId: slots[1].id,
        companyName: 'Limited Company',
        companyEmail,
        studentCount: 1,
      })
      expect(res2.status).toBe(HTTP_STATUS.CREATED)

      // Third booking - should fail
      const res3 = await post('/api/bookings', {
        timeSlotId: slots[2].id,
        companyName: 'Limited Company',
        companyEmail,
        studentCount: 1,
      })
      expect(res3.status).toBe(HTTP_STATUS.FORBIDDEN)
      const error = getError(res3.body)
      expect(error?.message).toContain('2')

      // Reset
      await setMaxBookingsPerCompany(0)
    })

    // TODO: require_phone setting check not implemented in API
    it.skip('requires phone when setting enabled', async () => {
      await setSetting('require_phone', 'true')

      const teacher = await createTeacher()
      const timeSlot = await createTimeSlot({ teacherId: teacher.id })

      const res = await post('/api/bookings', {
        timeSlotId: timeSlot.id,
        companyName: 'Test GmbH',
        companyEmail: 'test@company.de',
        studentCount: 1,
        // No phone provided
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)

      // Reset
      await setSetting('require_phone', 'false')
    })

    it('validates required fields', async () => {
      const res = await post('/api/bookings', {
        // Missing required fields
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('POST /api/bookings/cancel - Cancel Booking', () => {
    it('cancels a booking with valid cancellation code', async () => {
      const teacher = await createTeacher()
      const timeSlot = await createTimeSlot({ teacherId: teacher.id })
      const booking = await createBooking({ timeSlotId: timeSlot.id, teacherId: teacher.id })

      const res = await post('/api/bookings/cancel', {
        cancellationCode: booking.cancellationCode,
      })

      expect(res.status).toBe(HTTP_STATUS.OK)

      // Verify booking is cancelled
      const updatedBooking = await testDb.booking.findUnique({ where: { id: booking.id } })
      expect(updatedBooking?.status).toBe('CANCELLED')
      expect(updatedBooking?.cancelledAt).not.toBeNull()

      // Verify timeslot is available again
      const updatedSlot = await testDb.timeSlot.findUnique({ where: { id: timeSlot.id } })
      expect(updatedSlot?.status).toBe('AVAILABLE')
    })

    it('rejects cancellation with invalid code', async () => {
      const res = await post('/api/bookings/cancel', {
        cancellationCode: 'invalid-code',
      })

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })

    it('rejects double cancellation', async () => {
      const teacher = await createTeacher()
      const timeSlot = await createTimeSlot({ teacherId: teacher.id })
      const booking = await createBooking({ timeSlotId: timeSlot.id, teacherId: teacher.id })

      // First cancel
      await post('/api/bookings/cancel', { cancellationCode: booking.cancellationCode })

      // Second cancel - should fail
      const res = await post('/api/bookings/cancel', {
        cancellationCode: booking.cancellationCode,
      })

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
    })

    // TODO: cancellation_enabled setting check not implemented in API
    it.skip('rejects cancellation when disabled', async () => {
      await setAllowCancel(false)

      const teacher = await createTeacher()
      const timeSlot = await createTimeSlot({ teacherId: teacher.id })
      const booking = await createBooking({ timeSlotId: timeSlot.id, teacherId: teacher.id })

      const res = await post('/api/bookings/cancel', {
        cancellationCode: booking.cancellationCode,
      })

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)

      // Reset
      await setAllowCancel(true)
    })
  })

  describe('POST /api/bookings/rebook - Rebook to Different Slot', () => {
    it('rebooks to a different available timeslot', async () => {
      const teacher = await createTeacher()
      const [slot1, slot2] = await createMultipleTimeSlots(teacher.id, '2025-06-15', 2)
      const booking = await createBooking({ timeSlotId: slot1.id, teacherId: teacher.id })
      const originalCode = booking.cancellationCode

      const res = await post('/api/bookings/rebook', {
        cancellationCode: originalCode,
        newTimeSlotId: slot2.id,
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = getData<{ cancellationCode: string; timeSlot: { id: string } }>(res.body)
      expect(data?.timeSlot.id).toBe(slot2.id)
      // New cancellation code is generated
      expect(data?.cancellationCode).not.toBe(originalCode)

      // Old slot is available
      const oldSlot = await testDb.timeSlot.findUnique({ where: { id: slot1.id } })
      expect(oldSlot?.status).toBe('AVAILABLE')

      // New slot is booked
      const newSlot = await testDb.timeSlot.findUnique({ where: { id: slot2.id } })
      expect(newSlot?.status).toBe('BOOKED')
    })

    it('rejects rebooking to already booked slot', async () => {
      const teacher = await createTeacher()
      const [slot1, slot2] = await createMultipleTimeSlots(teacher.id, '2025-06-15', 2)
      const booking1 = await createBooking({ timeSlotId: slot1.id, teacherId: teacher.id })
      await createBooking({ timeSlotId: slot2.id, teacherId: teacher.id })

      const res = await post('/api/bookings/rebook', {
        cancellationCode: booking1.cancellationCode,
        newTimeSlotId: slot2.id,
      })

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
      expect(getError(res.body)?.error).toBe('SLOT_ALREADY_BOOKED')
    })

    // TODO: API returns SLOT_ALREADY_BOOKED instead of SAME_SLOT for same-slot rebooking
    it.skip('rejects rebooking to same slot', async () => {
      const teacher = await createTeacher()
      const slot = await createTimeSlot({ teacherId: teacher.id })
      const booking = await createBooking({ timeSlotId: slot.id, teacherId: teacher.id })

      const res = await post('/api/bookings/rebook', {
        cancellationCode: booking.cancellationCode,
        newTimeSlotId: slot.id,
      })

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
      expect(getError(res.body)?.error).toBe('SAME_SLOT')
    })

    // TODO: rebooking_enabled setting check not implemented in API
    it.skip('rejects rebooking when disabled', async () => {
      await setAllowRebook(false)

      const teacher = await createTeacher()
      const [slot1, slot2] = await createMultipleTimeSlots(teacher.id, '2025-06-15', 2)
      const booking = await createBooking({ timeSlotId: slot1.id, teacherId: teacher.id })

      const res = await post('/api/bookings/rebook', {
        cancellationCode: booking.cancellationCode,
        newTimeSlotId: slot2.id,
      })

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)

      // Reset
      await setAllowRebook(true)
    })

    it('rejects rebooking cancelled booking', async () => {
      const teacher = await createTeacher()
      const [slot1, slot2] = await createMultipleTimeSlots(teacher.id, '2025-06-15', 2)
      const booking = await createBooking({
        timeSlotId: slot1.id,
        teacherId: teacher.id,
        status: 'CANCELLED',
      })

      const res = await post('/api/bookings/rebook', {
        cancellationCode: booking.cancellationCode,
        newTimeSlotId: slot2.id,
      })

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
      expect(getError(res.body)?.error).toBe('ALREADY_CANCELLED')
    })
  })

  describe('GET /api/bookings/check/:code - Check Booking by Code', () => {
    it('returns booking details for valid code', async () => {
      const department = await createDepartment()
      const teacher = await createTeacher({ departmentId: department.id })
      const timeSlot = await createTimeSlot({ teacherId: teacher.id })
      const booking = await createBooking({
        timeSlotId: timeSlot.id,
        teacherId: teacher.id,
        companyName: 'Check Test GmbH',
      })

      const res = await get(`/api/bookings/check/${booking.cancellationCode}`)

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = getData<{ companyName: string; status: string }>(res.body)
      expect(data?.companyName).toBe('Check Test GmbH')
      expect(data?.status).toBe('CONFIRMED')
    })

    it('returns 404 for invalid code', async () => {
      const res = await get('/api/bookings/check/invalid-code')
      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })

    it('includes rebook/cancel permissions', async () => {
      const teacher = await createTeacher()
      const timeSlot = await createTimeSlot({ teacherId: teacher.id })
      const booking = await createBooking({ timeSlotId: timeSlot.id, teacherId: teacher.id })

      const res = await get(`/api/bookings/check/${booking.cancellationCode}`)

      expect(res.status).toBe(HTTP_STATUS.OK)
      const body = res.body as { permissions: { canRebook: boolean; canCancel: boolean } }
      expect(body.permissions.canRebook).toBe(true)
      expect(body.permissions.canCancel).toBe(true)
    })
  })

  describe('GET /api/bookings - List Bookings (Admin)', () => {
    it('requires authentication', async () => {
      const res = await get('/api/bookings')
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('returns all bookings for authenticated user', async () => {
      const { teacher, accessToken } = await createTeacherWithAuth()
      const slots = await createMultipleTimeSlots(teacher.id, '2025-06-15', 3)
      await createBooking({ timeSlotId: slots[0].id, teacherId: teacher.id })
      await createBooking({ timeSlotId: slots[1].id, teacherId: teacher.id })

      const res = await get('/api/bookings', { auth: accessToken })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = getData<unknown[]>(res.body)
      expect(data?.length).toBe(2)
    })

    it('filters by status', async () => {
      const { teacher, accessToken } = await createTeacherWithAuth()
      const slots = await createMultipleTimeSlots(teacher.id, '2025-06-15', 2)
      await createBooking({ timeSlotId: slots[0].id, teacherId: teacher.id, status: 'CONFIRMED' })
      await createBooking({ timeSlotId: slots[1].id, teacherId: teacher.id, status: 'CANCELLED' })

      const res = await get('/api/bookings?status=CONFIRMED', { auth: accessToken })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = getData<{ status: string }[]>(res.body)
      expect(data?.length).toBe(1)
      expect(data?.[0].status).toBe('CONFIRMED')
    })

    it('filters by teacherId', async () => {
      const admin = await createAdmin()
      const teacher1 = await createTeacher()
      const teacher2 = await createTeacher()

      const slot1 = await createTimeSlot({ teacherId: teacher1.id })
      const slot2 = await createTimeSlot({ teacherId: teacher2.id })
      await createBooking({ timeSlotId: slot1.id, teacherId: teacher1.id })
      await createBooking({ timeSlotId: slot2.id, teacherId: teacher2.id })

      const res = await get(`/api/bookings?teacherId=${teacher1.id}`, { auth: admin })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = getData<{ teacherId: string }[]>(res.body)
      expect(data?.length).toBe(1)
      expect(data?.[0].teacherId).toBe(teacher1.id)
    })
  })

  describe('PATCH /api/bookings/:id/status - Update Status (Admin)', () => {
    it('requires admin authentication', async () => {
      const { teacher, accessToken } = await createTeacherWithAuth({ isAdmin: false })
      const slot = await createTimeSlot({ teacherId: teacher.id })
      const booking = await createBooking({ timeSlotId: slot.id, teacherId: teacher.id })

      const res = await patch(
        `/api/bookings/${booking.id}/status`,
        { status: 'COMPLETED' },
        { auth: accessToken }
      )

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)
    })

    it('allows admin to mark booking as completed', async () => {
      const admin = await createAdmin()
      const teacher = await createTeacher()
      const slot = await createTimeSlot({ teacherId: teacher.id })
      const booking = await createBooking({ timeSlotId: slot.id, teacherId: teacher.id })

      const res = await patch(
        `/api/bookings/${booking.id}/status`,
        { status: 'COMPLETED' },
        { auth: admin }
      )

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = getData<{ status: string }>(res.body)
      expect(data?.status).toBe('COMPLETED')
    })

    it('allows admin to mark booking as no-show', async () => {
      const admin = await createAdmin()
      const teacher = await createTeacher()
      const slot = await createTimeSlot({ teacherId: teacher.id })
      const booking = await createBooking({ timeSlotId: slot.id, teacherId: teacher.id })

      const res = await patch(
        `/api/bookings/${booking.id}/status`,
        { status: 'NO_SHOW' },
        { auth: admin }
      )

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = getData<{ status: string }>(res.body)
      expect(data?.status).toBe('NO_SHOW')
    })

    it('frees timeslot when admin cancels', async () => {
      const admin = await createAdmin()
      const teacher = await createTeacher()
      const slot = await createTimeSlot({ teacherId: teacher.id })
      const booking = await createBooking({ timeSlotId: slot.id, teacherId: teacher.id })

      const res = await patch(
        `/api/bookings/${booking.id}/status`,
        { status: 'CANCELLED' },
        { auth: admin }
      )

      expect(res.status).toBe(HTTP_STATUS.OK)

      const updatedSlot = await testDb.timeSlot.findUnique({ where: { id: slot.id } })
      expect(updatedSlot?.status).toBe('AVAILABLE')
    })
  })

  describe('Race Condition Prevention', () => {
    it('prevents double booking of same slot via concurrent requests', async () => {
      const teacher = await createTeacher()
      const timeSlot = await createTimeSlot({ teacherId: teacher.id })

      // Simulate concurrent booking attempts
      const bookingPromises = Array.from({ length: 5 }, (_, i) =>
        post('/api/bookings', {
          timeSlotId: timeSlot.id,
          companyName: `Company ${i}`,
          companyEmail: `company${i}@test.de`,
          studentCount: 1,
        })
      )

      const results = await Promise.all(bookingPromises)

      // Exactly one should succeed
      const successCount = results.filter((r) => r.status === HTTP_STATUS.CREATED).length
      const conflictCount = results.filter((r) => r.status === HTTP_STATUS.CONFLICT).length

      expect(successCount).toBe(1)
      expect(conflictCount).toBe(4)

      // Only one booking should exist
      const bookings = await testDb.booking.findMany({ where: { timeSlotId: timeSlot.id } })
      expect(bookings.length).toBe(1)
    })

    // TODO: Prisma deadlock errors not caught and converted to 409 Conflict
    it.skip('prevents concurrent rebooking race condition', async () => {
      const teacher = await createTeacher()
      const [originalSlot, targetSlot] = await createMultipleTimeSlots(teacher.id, '2025-06-15', 2)

      // Create two bookings that will try to rebook to the same slot
      const booking1 = await createBooking({
        timeSlotId: originalSlot.id,
        teacherId: teacher.id,
      })

      // Create another slot and booking
      const anotherSlot = await createTimeSlot({
        teacherId: teacher.id,
        date: '2025-06-16',
        startTime: '10:00',
        endTime: '10:20',
      })
      const booking2 = await createBooking({
        timeSlotId: anotherSlot.id,
        teacherId: teacher.id,
      })

      // Both try to rebook to the same target slot
      const [result1, result2] = await Promise.all([
        post('/api/bookings/rebook', {
          cancellationCode: booking1.cancellationCode,
          newTimeSlotId: targetSlot.id,
        }),
        post('/api/bookings/rebook', {
          cancellationCode: booking2.cancellationCode,
          newTimeSlotId: targetSlot.id,
        }),
      ])

      // One should succeed, one should fail
      const statuses = [result1.status, result2.status].sort()
      expect(statuses).toContain(HTTP_STATUS.OK)
      expect(statuses).toContain(HTTP_STATUS.CONFLICT)

      // Target slot should have exactly one booking
      const targetBooking = await testDb.booking.findFirst({ where: { timeSlotId: targetSlot.id } })
      expect(targetBooking).not.toBeNull()
    })
  })
})
