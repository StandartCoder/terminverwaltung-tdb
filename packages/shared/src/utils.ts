import { format, parseISO, isToday, isTomorrow, isAfter, isBefore } from 'date-fns'
import { de } from 'date-fns/locale'

// =============================================================================
// DATE FORMATTING
// =============================================================================

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'EEEE, d. MMMM yyyy', { locale: de })
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'd. MMM', { locale: de })
}

export function formatDateCompact(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd.MM.yyyy', { locale: de })
}

// =============================================================================
// TIME FORMATTING
// =============================================================================

export function formatTime(time: Date | string): string {
  const t = typeof time === 'string' ? parseISO(time) : time
  return format(t, 'HH:mm')
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd.MM.yyyy HH:mm', { locale: de })
}

// =============================================================================
// DATE/TIME PARSING
// =============================================================================

export function parseTimeString(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const date = new Date('1970-01-01T00:00:00.000Z')
  date.setUTCHours(hours, minutes, 0, 0)
  return date
}

export function parseDateString(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00.000Z')
}

// =============================================================================
// DATE HELPERS
// =============================================================================

export function getDateLabel(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isToday(d)) return 'Heute'
  if (isTomorrow(d)) return 'Morgen'
  return formatDate(d)
}

export function isCurrentSlot(slotDate: string, startTime: string, endTime: string): boolean {
  const now = new Date()
  const date = parseISO(slotDate)
  const start = parseISO(startTime)
  const end = parseISO(endTime)

  const slotStart = new Date(date)
  slotStart.setHours(start.getHours(), start.getMinutes(), 0, 0)

  const slotEnd = new Date(date)
  slotEnd.setHours(end.getHours(), end.getMinutes(), 0, 0)

  return isAfter(now, slotStart) && isBefore(now, slotEnd)
}

export function isPastSlot(slotDate: string, endTime: string): boolean {
  const now = new Date()
  const date = parseISO(slotDate)
  const end = parseISO(endTime)

  const slotEnd = new Date(date)
  slotEnd.setHours(end.getHours(), end.getMinutes(), 0, 0)

  return isAfter(now, slotEnd)
}

// =============================================================================
// DATA HELPERS
// =============================================================================

export interface TimeSlotLike {
  id: string
  teacher?: { id: string } | null
}

export function groupSlotsByTeacher<T extends TimeSlotLike>(slots: T[]): Record<string, T[]> {
  const grouped: Record<string, T[]> = {}
  slots.forEach((slot) => {
    const teacherKey = slot.teacher?.id || 'unknown'
    if (!grouped[teacherKey]) grouped[teacherKey] = []
    grouped[teacherKey].push(slot)
  })
  return grouped
}

// =============================================================================
// STUDENT HELPERS
// =============================================================================

export interface Student {
  name?: string
  class?: string
}

export function formatStudents(students: unknown): { names: string; classes: string } {
  if (!students || !Array.isArray(students)) {
    return { names: '', classes: '' }
  }
  const studentList = students as Student[]
  const names = studentList
    .map((s) => s.name || '')
    .filter(Boolean)
    .join(', ')
  const classes = studentList
    .map((s) => s.class || '')
    .filter(Boolean)
    .join(', ')
  return { names, classes }
}

export function getFirstStudentName(students: unknown): string {
  if (!students || !Array.isArray(students)) return ''
  const studentList = students as Student[]
  return studentList[0]?.name || ''
}

// =============================================================================
// STRING HELPERS
// =============================================================================

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase()
}

export function getFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`
}

export function getTeacherDisplayName(firstName: string, lastName: string): string {
  return `${lastName}, ${firstName}`
}

// =============================================================================
// GREETING
// =============================================================================

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Guten Morgen'
  if (hour < 18) return 'Guten Tag'
  return 'Guten Abend'
}

// Re-export date-fns functions that are commonly used
export { parseISO, isToday, isTomorrow, isAfter, isBefore }
