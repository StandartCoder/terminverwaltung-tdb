import type { Booking, Setting, Teacher, TimeSlot } from '@/lib/api'

export interface Statistics {
  bookings: { total: number; confirmed: number; cancelled: number }
  timeSlots: { total: number; available: number; booked: number; utilizationRate: string }
  teachers: number
  companies: number
}

export interface DashboardState {
  activeTab: AdminTab
  selectedDate: string
  newSlotDate: string
  newSlotStart: string
  newSlotEnd: string
}

export type AdminTab =
  | 'overview'
  | 'appointments'
  | 'events'
  | 'departments'
  | 'teachers'
  | 'settings'

export interface OverviewTabProps {
  teacher: Teacher
  statistics?: Statistics
  bookings: Booking[]
}

export interface AppointmentsTabProps {
  slots: TimeSlot[]
  loadingSlots: boolean
  confirmedBookings: Booking[]
  selectedDate: string
  setSelectedDate: (date: string) => void
  newSlotDate: string
  setNewSlotDate: (date: string) => void
  newSlotStart: string
  setNewSlotStart: (time: string) => void
  newSlotEnd: string
  setNewSlotEnd: (time: string) => void
  onCreateSlot: () => void
  onToggleStatus: (id: string, status: 'AVAILABLE' | 'BLOCKED') => void
  onDeleteSlot: (id: string) => void
  isCreating: boolean
}

export interface SettingsTabProps {
  settings: Setting[]
  settingsMap: Record<string, string>
}

export interface BookingWithTiming extends Booking {
  slotStart: Date
  slotEnd: Date
}

export interface ScheduleData {
  currentAppointment: Booking | null
  nextAppointment: Booking | null
  todayBookings: Booking[]
  tomorrowBookings: Booking[]
}
