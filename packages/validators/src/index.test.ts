import { describe, it, expect } from 'vitest'
import {
  emailSchema,
  phoneSchema,
  timeStringSchema,
  idSchema,
  createDepartmentSchema,
  createTeacherSchema,
  teacherLoginSchema,
  createTimeSlotSchema,
  createBookingSchema,
  cancelBookingSchema,
  bookingStatusSchema,
  timeSlotStatusSchema,
} from './index'

describe('Base Schemas', () => {
  describe('emailSchema', () => {
    it('accepts valid email addresses', () => {
      expect(emailSchema.safeParse('test@example.com').success).toBe(true)
      expect(emailSchema.safeParse('user.name@domain.de').success).toBe(true)
      expect(emailSchema.safeParse('admin@osz-teltow.de').success).toBe(true)
    })

    it('rejects invalid email addresses', () => {
      expect(emailSchema.safeParse('invalid').success).toBe(false)
      expect(emailSchema.safeParse('no-at-sign.com').success).toBe(false)
      expect(emailSchema.safeParse('@nodomain.com').success).toBe(false)
      expect(emailSchema.safeParse('').success).toBe(false)
    })
  })

  describe('phoneSchema', () => {
    it('accepts valid phone numbers', () => {
      expect(phoneSchema.safeParse('+49 123 456789').success).toBe(true)
      expect(phoneSchema.safeParse('030-12345678').success).toBe(true)
      expect(phoneSchema.safeParse('(030) 1234567').success).toBe(true)
      expect(phoneSchema.safeParse(null).success).toBe(true)
      expect(phoneSchema.safeParse(undefined).success).toBe(true)
    })

    it('rejects invalid phone numbers', () => {
      expect(phoneSchema.safeParse('abc').success).toBe(false)
      expect(phoneSchema.safeParse('phone: 123').success).toBe(false)
    })
  })

  describe('timeStringSchema', () => {
    it('accepts valid time strings HH:MM', () => {
      expect(timeStringSchema.safeParse('08:00').success).toBe(true)
      expect(timeStringSchema.safeParse('14:30').success).toBe(true)
      expect(timeStringSchema.safeParse('23:59').success).toBe(true)
      expect(timeStringSchema.safeParse('00:00').success).toBe(true)
    })

    it('rejects invalid time strings', () => {
      expect(timeStringSchema.safeParse('8:00').success).toBe(false)
      expect(timeStringSchema.safeParse('25:00').success).toBe(false)
      expect(timeStringSchema.safeParse('12:60').success).toBe(false)
      expect(timeStringSchema.safeParse('12:5').success).toBe(false)
      expect(timeStringSchema.safeParse('noon').success).toBe(false)
    })
  })

  describe('idSchema', () => {
    it('accepts valid CUIDs', () => {
      expect(idSchema.safeParse('clx1234567890abcdefghij').success).toBe(true)
    })

    it('rejects invalid CUIDs', () => {
      expect(idSchema.safeParse('').success).toBe(false)
      expect(idSchema.safeParse('123').success).toBe(false)
      expect(idSchema.safeParse('not-a-cuid').success).toBe(false)
    })
  })
})

describe('Department Schemas', () => {
  describe('createDepartmentSchema', () => {
    it('accepts valid department data', () => {
      const result = createDepartmentSchema.safeParse({
        name: 'Fachinformatiker/in',
        shortCode: 'IT',
        color: '#3B82F6',
      })
      expect(result.success).toBe(true)
    })

    it('accepts department without color', () => {
      const result = createDepartmentSchema.safeParse({
        name: 'Test Department',
        shortCode: 'TST',
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty name', () => {
      const result = createDepartmentSchema.safeParse({
        name: '',
        shortCode: 'TST',
      })
      expect(result.success).toBe(false)
    })

    it('rejects shortCode longer than 10 characters', () => {
      const result = createDepartmentSchema.safeParse({
        name: 'Test',
        shortCode: 'TOOLONGCODE',
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid color format', () => {
      const result = createDepartmentSchema.safeParse({
        name: 'Test',
        shortCode: 'TST',
        color: 'red',
      })
      expect(result.success).toBe(false)
    })
  })
})

describe('Teacher Schemas', () => {
  describe('createTeacherSchema', () => {
    it('accepts valid teacher data', () => {
      const result = createTeacherSchema.safeParse({
        email: 'lehrer@osz-teltow.de',
        password: 'securepass123',
        firstName: 'Max',
        lastName: 'Mustermann',
        departmentId: 'clx1234567890abcdefghij',
      })
      expect(result.success).toBe(true)
    })

    it('accepts teacher with optional fields', () => {
      const result = createTeacherSchema.safeParse({
        email: 'lehrer@osz-teltow.de',
        password: 'securepass123',
        firstName: 'Max',
        lastName: 'Mustermann',
        departmentId: 'clx1234567890abcdefghij',
        room: 'A101',
        isAdmin: true,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.room).toBe('A101')
        expect(result.data.isAdmin).toBe(true)
      }
    })

    it('rejects password shorter than 6 characters', () => {
      const result = createTeacherSchema.safeParse({
        email: 'lehrer@osz-teltow.de',
        password: '12345',
        firstName: 'Max',
        lastName: 'Mustermann',
        departmentId: 'clx1234567890abcdefghij',
      })
      expect(result.success).toBe(false)
    })

    it('defaults isAdmin to false', () => {
      const result = createTeacherSchema.safeParse({
        email: 'lehrer@osz-teltow.de',
        password: 'securepass123',
        firstName: 'Max',
        lastName: 'Mustermann',
        departmentId: 'clx1234567890abcdefghij',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isAdmin).toBe(false)
      }
    })
  })

  describe('teacherLoginSchema', () => {
    it('accepts valid login credentials', () => {
      const result = teacherLoginSchema.safeParse({
        email: 'admin@osz-teltow.de',
        password: 'admin123',
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty password', () => {
      const result = teacherLoginSchema.safeParse({
        email: 'admin@osz-teltow.de',
        password: '',
      })
      expect(result.success).toBe(false)
    })
  })
})

describe('TimeSlot Schemas', () => {
  describe('timeSlotStatusSchema', () => {
    it('accepts valid statuses', () => {
      expect(timeSlotStatusSchema.safeParse('AVAILABLE').success).toBe(true)
      expect(timeSlotStatusSchema.safeParse('BOOKED').success).toBe(true)
      expect(timeSlotStatusSchema.safeParse('BLOCKED').success).toBe(true)
    })

    it('rejects invalid statuses', () => {
      expect(timeSlotStatusSchema.safeParse('INVALID').success).toBe(false)
      expect(timeSlotStatusSchema.safeParse('available').success).toBe(false)
    })
  })

  describe('createTimeSlotSchema', () => {
    it('accepts valid time slot data', () => {
      const result = createTimeSlotSchema.safeParse({
        date: '2025-01-15',
        startTime: '09:00',
        endTime: '09:20',
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid date format', () => {
      const result = createTimeSlotSchema.safeParse({
        date: '15-01-2025',
        startTime: '09:00',
        endTime: '09:20',
      })
      expect(result.success).toBe(false)
    })
  })
})

describe('Booking Schemas', () => {
  describe('bookingStatusSchema', () => {
    it('accepts valid statuses', () => {
      expect(bookingStatusSchema.safeParse('CONFIRMED').success).toBe(true)
      expect(bookingStatusSchema.safeParse('CANCELLED').success).toBe(true)
      expect(bookingStatusSchema.safeParse('COMPLETED').success).toBe(true)
      expect(bookingStatusSchema.safeParse('NO_SHOW').success).toBe(true)
    })

    it('rejects invalid statuses', () => {
      expect(bookingStatusSchema.safeParse('PENDING').success).toBe(false)
    })
  })

  describe('createBookingSchema', () => {
    it('accepts valid booking data', () => {
      const result = createBookingSchema.safeParse({
        timeSlotId: 'clx1234567890abcdefghij',
        companyName: 'Muster GmbH',
        companyEmail: 'kontakt@muster.de',
      })
      expect(result.success).toBe(true)
    })

    it('accepts booking with all optional fields', () => {
      const result = createBookingSchema.safeParse({
        timeSlotId: 'clx1234567890abcdefghij',
        companyName: 'Muster GmbH',
        companyEmail: 'kontakt@muster.de',
        companyPhone: '+49 30 123456',
        contactName: 'Herr Müller',
        studentCount: 3,
        students: [
          { name: 'Anna', class: 'FI21' },
          { name: 'Ben', class: 'FI21' },
        ],
        parentName: 'Frau Schmidt',
        parentEmail: 'schmidt@example.de',
        notes: 'Bitte Rückruf',
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty company name', () => {
      const result = createBookingSchema.safeParse({
        timeSlotId: 'clx1234567890abcdefghij',
        companyName: '',
        companyEmail: 'kontakt@muster.de',
      })
      expect(result.success).toBe(false)
    })

    it('rejects studentCount greater than 10', () => {
      const result = createBookingSchema.safeParse({
        timeSlotId: 'clx1234567890abcdefghij',
        companyName: 'Muster GmbH',
        companyEmail: 'kontakt@muster.de',
        studentCount: 15,
      })
      expect(result.success).toBe(false)
    })

    it('rejects notes longer than 500 characters', () => {
      const result = createBookingSchema.safeParse({
        timeSlotId: 'clx1234567890abcdefghij',
        companyName: 'Muster GmbH',
        companyEmail: 'kontakt@muster.de',
        notes: 'a'.repeat(501),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('cancelBookingSchema', () => {
    it('accepts valid cancellation code', () => {
      const result = cancelBookingSchema.safeParse({
        cancellationCode: 'abc123xyz',
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty cancellation code', () => {
      const result = cancelBookingSchema.safeParse({
        cancellationCode: '',
      })
      expect(result.success).toBe(false)
    })
  })
})
