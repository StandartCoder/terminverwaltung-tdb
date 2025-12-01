import { z } from 'zod'

// =============================================================================
// CONSTANTS
// =============================================================================

export const TIME_SLOT_STATUS = ['AVAILABLE', 'BOOKED', 'BLOCKED'] as const
export const BOOKING_STATUS = ['CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'] as const
export const EMAIL_TYPE = [
  'BOOKING_CONFIRMATION',
  'BOOKING_CANCELLATION',
  'BOOKING_REMINDER',
  'BOOKING_UPDATE',
] as const
export const EMAIL_STATUS = ['PENDING', 'SENT', 'FAILED'] as const

// =============================================================================
// BASE SCHEMAS
// =============================================================================

export const idSchema = z.string().cuid()

export const emailSchema = z.string().email('Ungültige E-Mail-Adresse')

export const phoneSchema = z
  .string()
  .regex(/^[+]?[(]?[0-9]{1,3}[)]?[-\s./0-9]*$/, 'Ungültige Telefonnummer')
  .optional()
  .nullable()

export const dateSchema = z.coerce.date()

export const timeStringSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format: HH:MM')

// =============================================================================
// DEPARTMENT SCHEMAS
// =============================================================================

export const departmentSchema = z.object({
  id: idSchema,
  name: z.string().min(1, 'Name erforderlich'),
  shortCode: z.string().min(1).max(10),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
})

export const createDepartmentSchema = departmentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export type Department = z.infer<typeof departmentSchema>
export type CreateDepartment = z.infer<typeof createDepartmentSchema>

// =============================================================================
// TEACHER SCHEMAS
// =============================================================================

export const teacherSchema = z.object({
  id: idSchema,
  email: emailSchema,
  passwordHash: z.string(),
  firstName: z.string().min(1, 'Vorname erforderlich'),
  lastName: z.string().min(1, 'Nachname erforderlich'),
  room: z.string().optional().nullable(),
  isAdmin: z.boolean(),
  isActive: z.boolean(),
  departmentId: idSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
})

export const teacherPublicSchema = teacherSchema.omit({ passwordHash: true })

export const createTeacherSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Mindestens 6 Zeichen'),
  firstName: z.string().min(1, 'Vorname erforderlich'),
  lastName: z.string().min(1, 'Nachname erforderlich'),
  room: z.string().optional().nullable(),
  departmentId: idSchema,
  isAdmin: z.boolean().optional().default(false),
})

export const updateTeacherSchema = createTeacherSchema.partial().omit({ password: true })

export const teacherLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Passwort erforderlich'),
})

export type Teacher = z.infer<typeof teacherSchema>
export type TeacherPublic = z.infer<typeof teacherPublicSchema>
export type CreateTeacher = z.infer<typeof createTeacherSchema>
export type UpdateTeacher = z.infer<typeof updateTeacherSchema>
export type TeacherLogin = z.infer<typeof teacherLoginSchema>

// =============================================================================
// COMPANY SCHEMAS
// =============================================================================

export const companySchema = z.object({
  id: idSchema,
  name: z.string().min(1, 'Firmenname erforderlich'),
  email: emailSchema,
  phone: phoneSchema,
  contactName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  studentCount: z.number().int().min(0),
  createdAt: dateSchema,
  updatedAt: dateSchema,
})

export const createCompanySchema = companySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const updateCompanySchema = createCompanySchema.partial()

export type Company = z.infer<typeof companySchema>
export type CreateCompany = z.infer<typeof createCompanySchema>
export type UpdateCompany = z.infer<typeof updateCompanySchema>

// =============================================================================
// STUDENT SCHEMAS
// =============================================================================

export const studentSchema = z.object({
  id: idSchema,
  firstName: z.string().min(1, 'Vorname erforderlich'),
  lastName: z.string().min(1, 'Nachname erforderlich'),
  email: emailSchema.optional().nullable(),
  class: z.string().optional().nullable(),
  departmentId: idSchema,
  companyId: idSchema,
  parentId: idSchema.optional().nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
})

export const createStudentSchema = studentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export type Student = z.infer<typeof studentSchema>
export type CreateStudent = z.infer<typeof createStudentSchema>

// =============================================================================
// TIMESLOT SCHEMAS
// =============================================================================

export const timeSlotStatusSchema = z.enum(TIME_SLOT_STATUS)

export const timeSlotSchema = z.object({
  id: idSchema,
  date: dateSchema,
  startTime: dateSchema,
  endTime: dateSchema,
  status: timeSlotStatusSchema,
  teacherId: idSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
})

export const createTimeSlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  startTime: timeStringSchema,
  endTime: timeStringSchema,
  teacherId: idSchema.optional(),
})

export const createBulkTimeSlotsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  slots: z.array(
    z.object({
      startTime: timeStringSchema,
      endTime: timeStringSchema,
    })
  ),
  teacherId: idSchema.optional(),
})

export const updateTimeSlotStatusSchema = z.object({
  status: timeSlotStatusSchema,
})

export type TimeSlotStatus = z.infer<typeof timeSlotStatusSchema>
export type TimeSlot = z.infer<typeof timeSlotSchema>
export type CreateTimeSlot = z.infer<typeof createTimeSlotSchema>
export type CreateBulkTimeSlots = z.infer<typeof createBulkTimeSlotsSchema>

// =============================================================================
// BOOKING SCHEMAS
// =============================================================================

export const bookingStatusSchema = z.enum(BOOKING_STATUS)

export const bookingSchema = z.object({
  id: idSchema,
  status: bookingStatusSchema,
  notes: z.string().optional().nullable(),
  cancellationCode: z.string(),
  bookedAt: dateSchema,
  cancelledAt: dateSchema.optional().nullable(),
  timeSlotId: idSchema,
  teacherId: idSchema,
  companyId: idSchema,
  studentId: idSchema.optional().nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
})

export const createBookingSchema = z.object({
  timeSlotId: idSchema,
  companyName: z.string().min(1, 'Firmenname erforderlich'),
  companyEmail: emailSchema,
  companyPhone: phoneSchema,
  contactName: z.string().min(1, 'Ansprechpartner erforderlich'),
  studentId: idSchema.optional().nullable(),
  notes: z.string().max(500, 'Maximal 500 Zeichen').optional().nullable(),
})

export const cancelBookingSchema = z.object({
  cancellationCode: z.string().min(1, 'Stornierungscode erforderlich'),
})

export type BookingStatus = z.infer<typeof bookingStatusSchema>
export type Booking = z.infer<typeof bookingSchema>
export type CreateBooking = z.infer<typeof createBookingSchema>
export type CancelBooking = z.infer<typeof cancelBookingSchema>

// =============================================================================
// EVENT SCHEMAS
// =============================================================================

export const eventSchema = z.object({
  id: idSchema,
  name: z.string().min(1, 'Name erforderlich'),
  description: z.string().optional().nullable(),
  startDate: dateSchema,
  endDate: dateSchema,
  bookingOpenAt: dateSchema.optional().nullable(),
  bookingCloseAt: dateSchema.optional().nullable(),
  defaultSlotLength: z.number().int().min(5).max(120),
  isActive: z.boolean(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
})

export const createEventSchema = eventSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export type Event = z.infer<typeof eventSchema>
export type CreateEvent = z.infer<typeof createEventSchema>

// =============================================================================
// FILTER & QUERY SCHEMAS
// =============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const bookingFilterSchema = z.object({
  status: bookingStatusSchema.optional(),
  teacherId: idSchema.optional(),
  departmentId: idSchema.optional(),
  companyId: idSchema.optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export const timeSlotFilterSchema = z.object({
  teacherId: idSchema.optional(),
  departmentId: idSchema.optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: timeSlotStatusSchema.optional(),
  available: z.coerce.boolean().optional(),
})

export type Pagination = z.infer<typeof paginationSchema>
export type BookingFilter = z.infer<typeof bookingFilterSchema>
export type TimeSlotFilter = z.infer<typeof timeSlotFilterSchema>

// =============================================================================
// API RESPONSE SCHEMAS
// =============================================================================

export const apiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
})

export const apiSuccessSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  })

export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  })

export type ApiError = z.infer<typeof apiErrorSchema>
