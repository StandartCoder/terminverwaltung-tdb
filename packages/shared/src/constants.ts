// =============================================================================
// HTTP STATUS CODES
// =============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const

export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS]

// =============================================================================
// ERROR CODES
// =============================================================================

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  SLOT_ALREADY_BOOKED: 'SLOT_ALREADY_BOOKED',
  SLOT_NOT_AVAILABLE: 'SLOT_NOT_AVAILABLE',
  SAME_SLOT: 'SAME_SLOT',
  BOOKING_CLOSED: 'BOOKING_CLOSED',
  INVALID_CANCELLATION_CODE: 'INVALID_CANCELLATION_CODE',
  ALREADY_CANCELLED: 'ALREADY_CANCELLED',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

// =============================================================================
// BUSINESS CONSTANTS
// =============================================================================

export const SLOT_DURATION_MINUTES = 20
export const LARGE_COMPANY_THRESHOLD = 5
export const DEFAULT_DEPARTMENT_COLOR = '#3B82F6'
export const AUTH_STORAGE_KEY = 'teacher_session'

// =============================================================================
// STATUS LABELS (German)
// =============================================================================

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'Bestätigt',
  CANCELLED: 'Storniert',
  COMPLETED: 'Abgeschlossen',
  NO_SHOW: 'Nicht erschienen',
}

export const TIMESLOT_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Verfügbar',
  BOOKED: 'Gebucht',
  BLOCKED: 'Blockiert',
}
