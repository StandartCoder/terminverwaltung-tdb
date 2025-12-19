const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Ein Fehler ist aufgetreten' }))
    throw new ApiError(response.status, error.error || 'UNKNOWN', error.message)
  }
  return response.json()
}

// Authenticated fetch - sends cookies with request
function authFetch(url: string, options?: RequestInit): Promise<Response> {
  return fetch(url, { credentials: 'include', ...options })
}

export const api = {
  departments: {
    // Public endpoints - used in booking flow
    list: async () => {
      const res = await fetch(`${API_BASE}/api/departments`)
      return handleResponse<{ data: Department[] }>(res)
    },
    get: async (id: string) => {
      const res = await fetch(`${API_BASE}/api/departments/${id}`)
      return handleResponse<{ data: DepartmentWithTeachers }>(res)
    },
    // Admin endpoints - require auth
    create: async (data: CreateDepartmentData) => {
      const res = await authFetch(`${API_BASE}/api/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return handleResponse<{ data: Department }>(res)
    },
    update: async (id: string, data: UpdateDepartmentData) => {
      const res = await authFetch(`${API_BASE}/api/departments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return handleResponse<{ data: Department }>(res)
    },
    delete: async (id: string) => {
      const res = await authFetch(`${API_BASE}/api/departments/${id}`, { method: 'DELETE' })
      return handleResponse<{ message: string }>(res)
    },
  },

  teachers: {
    // Public/authenticated endpoints
    list: async (params?: { departmentId?: string; active?: boolean }) => {
      const searchParams = new URLSearchParams()
      if (params?.departmentId) searchParams.set('departmentId', params.departmentId)
      if (params?.active !== undefined) searchParams.set('active', String(params.active))
      const res = await authFetch(`${API_BASE}/api/teachers?${searchParams}`)
      return handleResponse<{ data: Teacher[] }>(res)
    },
    get: async (id: string) => {
      const res = await authFetch(`${API_BASE}/api/teachers/${id}`)
      return handleResponse<{ data: TeacherWithSlots }>(res)
    },
    create: async (data: CreateTeacherData) => {
      const res = await authFetch(`${API_BASE}/api/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return handleResponse<{ data: Teacher }>(res)
    },
    update: async (id: string, data: UpdateTeacherData) => {
      const res = await authFetch(`${API_BASE}/api/teachers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return handleResponse<{ data: Teacher }>(res)
    },
    delete: async (id: string) => {
      const res = await authFetch(`${API_BASE}/api/teachers/${id}`, { method: 'DELETE' })
      return handleResponse<{ message: string }>(res)
    },
    // Auth endpoints
    login: async (email: string, password: string) => {
      const res = await authFetch(`${API_BASE}/api/teachers/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      return handleResponse<{ data: { teacher: Teacher } }>(res)
    },
    logout: async () => {
      const res = await authFetch(`${API_BASE}/api/teachers/logout`, {
        method: 'POST',
      })
      return handleResponse<{ message: string }>(res)
    },
    me: async () => {
      const res = await authFetch(`${API_BASE}/api/teachers/me`)
      return handleResponse<{ data: Teacher }>(res)
    },
    refresh: async () => {
      const res = await authFetch(`${API_BASE}/api/teachers/refresh`, {
        method: 'POST',
      })
      return handleResponse<{ data: { teacher: Teacher } }>(res)
    },
    changePassword: async (id: string, currentPassword: string, newPassword: string) => {
      const res = await authFetch(`${API_BASE}/api/teachers/${id}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      return handleResponse<{ message: string }>(res)
    },
    setPassword: async (id: string, newPassword: string) => {
      const res = await authFetch(`${API_BASE}/api/teachers/${id}/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })
      return handleResponse<{ message: string }>(res)
    },
  },

  timeslots: {
    // Public endpoints - used in booking flow
    list: async (params?: TimeSlotFilterParams) => {
      const searchParams = new URLSearchParams()
      if (params?.teacherId) searchParams.set('teacherId', params.teacherId)
      if (params?.departmentId) searchParams.set('departmentId', params.departmentId)
      if (params?.date) searchParams.set('date', params.date)
      if (params?.available) searchParams.set('available', 'true')
      const res = await fetch(`${API_BASE}/api/timeslots?${searchParams}`)
      return handleResponse<{ data: TimeSlot[] }>(res)
    },
    available: async (params?: TimeSlotFilterParams) => {
      const searchParams = new URLSearchParams()
      if (params?.teacherId) searchParams.set('teacherId', params.teacherId)
      if (params?.departmentId) searchParams.set('departmentId', params.departmentId)
      if (params?.date) searchParams.set('date', params.date)
      const res = await fetch(`${API_BASE}/api/timeslots/available?${searchParams}`)
      return handleResponse<{ data: TimeSlot[] }>(res)
    },
    dates: async () => {
      const res = await fetch(`${API_BASE}/api/timeslots/dates`)
      return handleResponse<{ data: string[] }>(res)
    },
    settings: async () => {
      const res = await fetch(`${API_BASE}/api/timeslots/settings`)
      return handleResponse<{ data: TimeSlotSettings }>(res)
    },
    // Authenticated endpoints
    create: async (data: CreateTimeSlotData) => {
      const res = await authFetch(`${API_BASE}/api/timeslots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return handleResponse<{ data: TimeSlot }>(res)
    },
    createBulk: async (data: CreateBulkTimeSlotsData) => {
      const res = await authFetch(`${API_BASE}/api/timeslots/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return handleResponse<{ data: TimeSlot[]; count: number }>(res)
    },
    generate: async (data: GenerateTimeSlotsData) => {
      const res = await authFetch(`${API_BASE}/api/timeslots/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return handleResponse<{ data: TimeSlot[]; count: number; settings: TimeSlotSettings }>(res)
    },
    updateStatus: async (id: string, status: 'AVAILABLE' | 'BLOCKED') => {
      const res = await authFetch(`${API_BASE}/api/timeslots/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      return handleResponse<{ data: TimeSlot }>(res)
    },
    delete: async (id: string) => {
      const res = await authFetch(`${API_BASE}/api/timeslots/${id}`, { method: 'DELETE' })
      return handleResponse<{ message: string }>(res)
    },
  },

  bookings: {
    // Public endpoints - used by companies
    create: async (data: CreateBookingData) => {
      const res = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return handleResponse<{ data: BookingConfirmation }>(res)
    },
    cancel: async (cancellationCode: string) => {
      const res = await fetch(`${API_BASE}/api/bookings/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellationCode }),
      })
      return handleResponse<{ message: string }>(res)
    },
    rebook: async (cancellationCode: string, newTimeSlotId: string) => {
      const res = await fetch(`${API_BASE}/api/bookings/rebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellationCode, newTimeSlotId }),
      })
      return handleResponse<{ data: BookingConfirmation }>(res)
    },
    check: async (code: string) => {
      const res = await fetch(`${API_BASE}/api/bookings/check/${code}`)
      return handleResponse<{ data: BookingDetails }>(res)
    },
    // Authenticated endpoints - admin views
    list: async (params?: BookingFilterParams) => {
      const searchParams = new URLSearchParams()
      if (params?.status) searchParams.set('status', params.status)
      if (params?.teacherId) searchParams.set('teacherId', params.teacherId)
      if (params?.companyEmail) searchParams.set('companyEmail', params.companyEmail)
      if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom)
      if (params?.dateTo) searchParams.set('dateTo', params.dateTo)
      const res = await authFetch(`${API_BASE}/api/bookings?${searchParams}`)
      return handleResponse<{ data: Booking[] }>(res)
    },
    updateStatus: async (id: string, status: string) => {
      const res = await authFetch(`${API_BASE}/api/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      return handleResponse<{ data: Booking }>(res)
    },
  },

  events: {
    // Public endpoints
    list: async () => {
      const res = await fetch(`${API_BASE}/api/events`)
      return handleResponse<{ data: Event[] }>(res)
    },
    getActive: async () => {
      const res = await fetch(`${API_BASE}/api/events/active`)
      return handleResponse<{ data: Event }>(res)
    },
    get: async (id: string) => {
      const res = await fetch(`${API_BASE}/api/events/${id}`)
      return handleResponse<{ data: Event }>(res)
    },
    // Authenticated endpoints
    create: async (data: CreateEventData) => {
      const res = await authFetch(`${API_BASE}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return handleResponse<{ data: Event }>(res)
    },
    update: async (id: string, data: UpdateEventData) => {
      const res = await authFetch(`${API_BASE}/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return handleResponse<{ data: Event }>(res)
    },
    delete: async (id: string) => {
      const res = await authFetch(`${API_BASE}/api/events/${id}`, { method: 'DELETE' })
      return handleResponse<{ message: string }>(res)
    },
  },

  settings: {
    // Public endpoint
    getPublic: async () => {
      const res = await fetch(`${API_BASE}/api/settings/public`)
      return handleResponse<{ data: Record<string, string> }>(res)
    },
    // Authenticated endpoints
    list: async () => {
      const res = await authFetch(`${API_BASE}/api/settings`)
      return handleResponse<{ data: Setting[]; map: Record<string, string> }>(res)
    },
    get: async (key: string) => {
      const res = await authFetch(`${API_BASE}/api/settings/${key}`)
      return handleResponse<{ data: Setting }>(res)
    },
    set: async (key: string, value: string, description?: string) => {
      const res = await authFetch(`${API_BASE}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, description }),
      })
      return handleResponse<{ data: Setting }>(res)
    },
    bulkUpdate: async (settings: { key: string; value: string }[]) => {
      const res = await authFetch(`${API_BASE}/api/settings/bulk`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })
      return handleResponse<{ data: Setting[] }>(res)
    },
    delete: async (key: string) => {
      const res = await authFetch(`${API_BASE}/api/settings/${key}`, { method: 'DELETE' })
      return handleResponse<{ message: string }>(res)
    },
  },

  export: {
    // All authenticated
    statistics: async () => {
      const res = await authFetch(`${API_BASE}/api/export/statistics`)
      return handleResponse<{ data: Statistics }>(res)
    },
    bookingsCsvUrl: (params?: { status?: string; dateFrom?: string; dateTo?: string }) => {
      const searchParams = new URLSearchParams()
      if (params?.status) searchParams.set('status', params.status)
      if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom)
      if (params?.dateTo) searchParams.set('dateTo', params.dateTo)
      return `${API_BASE}/api/export/bookings/csv?${searchParams}`
    },
    bookingsPrintUrl: (params?: {
      dateFrom?: string
      dateTo?: string
      departmentId?: string
      teacherId?: string
      includeEmpty?: boolean
    }) => {
      const searchParams = new URLSearchParams()
      if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom)
      if (params?.dateTo) searchParams.set('dateTo', params.dateTo)
      if (params?.departmentId) searchParams.set('departmentId', params.departmentId)
      if (params?.teacherId) searchParams.set('teacherId', params.teacherId)
      if (params?.includeEmpty) searchParams.set('includeEmpty', 'true')
      return `${API_BASE}/api/export/bookings/print?${searchParams}`
    },
    bookingsOverviewPrintUrl: (params?: {
      status?: string
      dateFrom?: string
      dateTo?: string
      departmentId?: string
    }) => {
      const searchParams = new URLSearchParams()
      if (params?.status) searchParams.set('status', params.status)
      if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom)
      if (params?.dateTo) searchParams.set('dateTo', params.dateTo)
      if (params?.departmentId) searchParams.set('departmentId', params.departmentId)
      return `${API_BASE}/api/export/bookings/print/overview?${searchParams}`
    },
    timeslotsPrintUrl: (params?: { date?: string; departmentId?: string }) => {
      const searchParams = new URLSearchParams()
      if (params?.date) searchParams.set('date', params.date)
      if (params?.departmentId) searchParams.set('departmentId', params.departmentId)
      return `${API_BASE}/api/export/timeslots/print?${searchParams}`
    },
  },
}

// Types
export interface Department {
  id: string
  name: string
  shortCode: string
  color: string | null
  _count?: { teachers: number }
}

export interface DepartmentWithTeachers extends Department {
  teachers: { id: string; firstName: string; lastName: string; room: string | null }[]
}

export interface Teacher {
  id: string
  email: string
  firstName: string
  lastName: string
  room: string | null
  isAdmin: boolean
  isActive: boolean
  mustChangePassword: boolean
  departmentId: string
  department: { id: string; name: string; shortCode: string; color: string | null }
}

export interface TeacherWithSlots extends Teacher {
  timeSlots: TimeSlot[]
}

export interface TimeSlot {
  id: string
  date: string
  startTime: string
  endTime: string
  status: 'AVAILABLE' | 'BOOKED' | 'BLOCKED'
  teacherId: string
  teacher?: {
    id: string
    firstName: string
    lastName: string
    room: string | null
    department: { id: string; name: string; shortCode: string; color: string | null }
  }
  booking?: { id: string; companyName: string; status: string } | null
}

export interface TimeSlotFilterParams {
  teacherId?: string
  departmentId?: string
  date?: string
  available?: boolean
}

export interface CreateTimeSlotData {
  teacherId: string
  date: string
  startTime: string
  endTime: string
}

export interface CreateBulkTimeSlotsData {
  teacherId: string
  date: string
  slots: { startTime: string; endTime: string }[]
}

export interface TimeSlotSettings {
  slotDurationMinutes: number
  slotBufferMinutes: number
  dayStartTime: string
  dayEndTime: string
}

export interface GenerateTimeSlotsData {
  teacherId: string
  date: string
  startTime?: string
  endTime?: string
  slotDurationMinutes?: number
  slotBufferMinutes?: number
}

// Booking data - company info entered at booking time (no predefined companies)
export interface CreateBookingData {
  timeSlotId: string
  companyName: string
  companyEmail: string
  companyPhone?: string
  contactName?: string
  studentCount?: number
  students?: { name?: string; class?: string }[]
  parentName?: string
  parentEmail?: string
  notes?: string
}

export interface BookingConfirmation {
  id: string
  status: string
  bookedAt: string
  cancellationCode: string
  timeSlot: { date: string; startTime: string; endTime: string }
  teacher: {
    firstName: string
    lastName: string
    room: string | null
    department: { name: string; shortCode: string }
  }
}

export interface BookingDetails {
  id: string
  status: string
  bookedAt: string
  cancelledAt: string | null
  companyName: string
  teacher: {
    firstName: string
    lastName: string
    room: string | null
    department: { name: string }
  }
  timeSlot: { date: string; startTime: string; endTime: string }
}

// Booking with company info stored directly (no separate Company entity)
export interface Booking {
  id: string
  status: string
  companyName: string
  companyEmail: string
  companyPhone: string | null
  contactName: string | null
  studentCount: number
  studentName: string | null
  studentClass: string | null
  parentName: string | null
  parentEmail: string | null
  notes: string | null
  bookedAt: string
  cancelledAt: string | null
  teacher: Teacher
  timeSlot: TimeSlot
}

export interface BookingFilterParams {
  status?: string
  teacherId?: string
  companyEmail?: string
  dateFrom?: string
  dateTo?: string
}

export interface Statistics {
  bookings: { total: number; confirmed: number; cancelled: number }
  timeSlots: { total: number; available: number; booked: number; utilizationRate: string }
  teachers: number
  companies: number
}

export interface CreateDepartmentData {
  name: string
  shortCode: string
  color?: string
}

export interface UpdateDepartmentData {
  name?: string
  shortCode?: string
  color?: string | null
}

export interface CreateTeacherData {
  email: string
  password: string
  firstName: string
  lastName: string
  room?: string
  departmentId: string
  isAdmin?: boolean
}

export interface UpdateTeacherData {
  email?: string
  firstName?: string
  lastName?: string
  room?: string | null
  departmentId?: string
  isActive?: boolean
  isAdmin?: boolean
}

export interface Event {
  id: string
  name: string
  description: string | null
  startDate: string
  endDate: string
  bookingOpenAt: string | null
  bookingCloseAt: string | null
  defaultSlotLength: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateEventData {
  name: string
  description?: string
  startDate: string
  endDate: string
  bookingOpenAt?: string
  bookingCloseAt?: string
  defaultSlotLength?: number
  isActive?: boolean
}

export interface UpdateEventData {
  name?: string
  description?: string | null
  startDate?: string
  endDate?: string
  bookingOpenAt?: string | null
  bookingCloseAt?: string | null
  defaultSlotLength?: number
  isActive?: boolean
}

export interface Setting {
  id: string
  key: string
  value: string
  description: string | null
  createdAt: string
  updatedAt: string
}
