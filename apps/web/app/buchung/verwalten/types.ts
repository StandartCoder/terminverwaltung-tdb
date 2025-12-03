import type { BookingConfirmation, BookingDetails, TimeSlot } from '@/lib/api'

export type ViewMode = 'search' | 'details' | 'rebook'

export interface BookingManageState {
  code: string
  searchCode: string
  viewMode: ViewMode
  selectedDate: string | null
  selectedSlot: TimeSlot | null
  rebookConfirmation: BookingConfirmation | null
}

export interface BookingCodeFormProps {
  code: string
  onCodeChange: (code: string) => void
  onSearch: (e: React.FormEvent) => void
  isLoading: boolean
}

export interface BookingDetailsViewProps {
  booking: BookingDetails
  onStartRebook: () => void
  onCancel: () => void
  isCancelling: boolean
  isRebooking: boolean
}

export interface RebookFlowProps {
  booking: BookingDetails
  availableDates: string[]
  availableSlots: TimeSlot[]
  loadingSlots: boolean
  selectedDate: string | null
  selectedSlot: TimeSlot | null
  onDateSelect: (date: string) => void
  onSlotSelect: (slot: TimeSlot) => void
  onClearDate: () => void
  onClearSlot: () => void
  onConfirmRebook: () => void
  onBack: () => void
  isRebooking: boolean
}

export interface RebookConfirmationProps {
  confirmation: BookingConfirmation
}

export interface BookingNotFoundProps {
  onRetry?: () => void
}
