import { ERROR_CODES, HTTP_STATUS, type ErrorCode, type HttpStatus } from './constants'

// =============================================================================
// BASE APPLICATION ERROR
// =============================================================================

export abstract class AppError extends Error {
  abstract readonly code: ErrorCode
  abstract readonly statusCode: HttpStatus

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
    }
  }
}

// =============================================================================
// 404 NOT FOUND ERRORS
// =============================================================================

export class NotFoundError extends AppError {
  readonly code = ERROR_CODES.NOT_FOUND
  readonly statusCode = HTTP_STATUS.NOT_FOUND

  constructor(message = 'Ressource nicht gefunden') {
    super(message)
  }
}

// =============================================================================
// 409 CONFLICT ERRORS
// =============================================================================

export class ConflictError extends AppError {
  readonly code = ERROR_CODES.CONFLICT
  readonly statusCode = HTTP_STATUS.CONFLICT

  constructor(message: string) {
    super(message)
  }
}

export class SlotAlreadyBookedError extends AppError {
  readonly code = ERROR_CODES.SLOT_ALREADY_BOOKED
  readonly statusCode = HTTP_STATUS.CONFLICT

  constructor(message = 'Dieser Termin ist bereits vergeben') {
    super(message)
  }
}

export class AlreadyCancelledError extends AppError {
  readonly code = ERROR_CODES.ALREADY_CANCELLED
  readonly statusCode = HTTP_STATUS.CONFLICT

  constructor(message = 'Diese Buchung wurde bereits storniert') {
    super(message)
  }
}

export class SameSlotError extends AppError {
  readonly code = ERROR_CODES.SAME_SLOT
  readonly statusCode = HTTP_STATUS.CONFLICT

  constructor(message = 'Sie haben bereits diesen Termin gebucht') {
    super(message)
  }
}

// =============================================================================
// 403 FORBIDDEN ERRORS
// =============================================================================

export class ForbiddenError extends AppError {
  readonly code = ERROR_CODES.FORBIDDEN
  readonly statusCode = HTTP_STATUS.FORBIDDEN

  constructor(message = 'Zugriff verweigert') {
    super(message)
  }
}

// =============================================================================
// 401 UNAUTHORIZED ERRORS
// =============================================================================

export class UnauthorizedError extends AppError {
  readonly code = ERROR_CODES.UNAUTHORIZED
  readonly statusCode = HTTP_STATUS.UNAUTHORIZED

  constructor(message = 'Nicht autorisiert') {
    super(message)
  }
}

// =============================================================================
// 400 BAD REQUEST ERRORS
// =============================================================================

export class ValidationError extends AppError {
  readonly code = ERROR_CODES.VALIDATION_ERROR
  readonly statusCode = HTTP_STATUS.BAD_REQUEST

  constructor(message: string) {
    super(message)
  }
}

export class InvalidCancellationCodeError extends AppError {
  readonly code = ERROR_CODES.INVALID_CANCELLATION_CODE
  readonly statusCode = HTTP_STATUS.NOT_FOUND

  constructor(message = 'Ungültiger Buchungscode') {
    super(message)
  }
}

// =============================================================================
// TYPE GUARD
// =============================================================================

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
