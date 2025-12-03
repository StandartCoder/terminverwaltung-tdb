'use client'

import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { ArrowRight, Calendar, Clock, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { BookingDetails, TimeSlot } from '@/lib/api'

interface RebookFlowProps {
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

export function RebookFlow({
  booking,
  availableDates,
  availableSlots,
  loadingSlots,
  selectedDate,
  selectedSlot,
  onDateSelect,
  onSlotSelect,
  onClearDate,
  onClearSlot,
  onConfirmRebook,
  onBack,
  isRebooking,
}: RebookFlowProps) {
  const formatTime = (timeStr: string) => format(parseISO(timeStr), 'HH:mm')
  const formatDate = (dateStr: string) =>
    format(parseISO(dateStr), 'EEEE, d. MMMM yyyy', { locale: de })

  const groupSlotsByTeacher = (slots: TimeSlot[]) => {
    const grouped: Record<string, TimeSlot[]> = {}
    slots.forEach((slot) => {
      const teacherKey = slot.teacher?.id || 'unknown'
      if (!grouped[teacherKey]) grouped[teacherKey] = []
      grouped[teacherKey].push(slot)
    })
    return grouped
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Neuen Termin wählen</CardTitle>
          <Button variant="ghost" size="sm" onClick={onBack}>
            Zurück
          </Button>
        </div>
        <CardDescription>
          Wählen Sie einen neuen Termin. Ihr aktueller Termin wird automatisch freigegeben.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Current booking info */}
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Aktueller Termin (wird freigegeben)
          </p>
          <p className="mt-1 text-amber-700 dark:text-amber-300">
            {formatDate(booking.timeSlot.date)} um {formatTime(booking.timeSlot.startTime)} bei{' '}
            {booking.teacher.firstName} {booking.teacher.lastName}
          </p>
        </div>

        {/* Date selection */}
        {!selectedDate && (
          <DateSelection dates={availableDates} onSelect={onDateSelect} formatDate={formatDate} />
        )}

        {/* Slot selection */}
        {selectedDate && !selectedSlot && (
          <SlotSelection
            date={selectedDate}
            slots={availableSlots}
            loading={loadingSlots}
            onSelect={onSlotSelect}
            onBack={onClearDate}
            formatDate={formatDate}
            formatTime={formatTime}
            groupSlotsByTeacher={groupSlotsByTeacher}
          />
        )}

        {/* Confirmation */}
        {selectedSlot && (
          <RebookConfirmStep
            slot={selectedSlot}
            onConfirm={onConfirmRebook}
            onBack={onClearSlot}
            isRebooking={isRebooking}
            formatDate={formatDate}
            formatTime={formatTime}
          />
        )}
      </CardContent>
    </Card>
  )
}

function DateSelection({
  dates,
  onSelect,
  formatDate,
}: {
  dates: string[]
  onSelect: (date: string) => void
  formatDate: (d: string) => string
}) {
  return (
    <div className="space-y-3">
      <h4 className="font-medium">Datum auswählen</h4>
      <div className="grid gap-2 sm:grid-cols-2">
        {dates.map((date) => (
          <button
            key={date}
            onClick={() => onSelect(date)}
            className="bg-card hover:border-primary flex items-center gap-3 rounded-lg border p-4 text-left transition-all hover:shadow-sm"
          >
            <Calendar className="text-primary h-5 w-5" />
            <span className="font-medium">{formatDate(date)}</span>
          </button>
        ))}
      </div>
      {dates.length === 0 && (
        <p className="text-muted-foreground text-center">Keine verfügbaren Termine gefunden.</p>
      )}
    </div>
  )
}

function SlotSelection({
  date,
  slots,
  loading,
  onSelect,
  onBack,
  formatDate,
  formatTime,
  groupSlotsByTeacher,
}: {
  date: string
  slots: TimeSlot[]
  loading: boolean
  onSelect: (slot: TimeSlot) => void
  onBack: () => void
  formatDate: (d: string) => string
  formatTime: (t: string) => string
  groupSlotsByTeacher: (slots: TimeSlot[]) => Record<string, TimeSlot[]>
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Zeitslot wählen - {formatDate(date)}</h4>
        <Button variant="ghost" size="sm" onClick={onBack}>
          Anderes Datum
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="bg-muted h-24 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : slots.length > 0 ? (
        <div className="space-y-4">
          {Object.entries(groupSlotsByTeacher(slots)).map(([teacherId, teacherSlots]) => {
            const teacher = teacherSlots[0]?.teacher
            if (!teacher) return null

            return (
              <div key={teacherId} className="rounded-lg border p-4">
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: teacher.department?.color || '#3B82F6' }}
                  >
                    {teacher.firstName[0]}
                    {teacher.lastName[0]}
                  </div>
                  <div>
                    <p className="font-medium">
                      {teacher.firstName} {teacher.lastName}
                    </p>
                    {teacher.room && (
                      <p className="text-muted-foreground text-sm">Raum {teacher.room}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {teacherSlots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => onSelect(slot)}
                      className="bg-background hover:border-primary hover:bg-primary hover:text-primary-foreground inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all"
                    >
                      <Clock className="h-4 w-4" />
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-muted-foreground py-8 text-center">
          Keine verfügbaren Termine an diesem Tag.
        </p>
      )}
    </div>
  )
}

function RebookConfirmStep({
  slot,
  onConfirm,
  onBack,
  isRebooking,
  formatDate,
  formatTime,
}: {
  slot: TimeSlot
  onConfirm: () => void
  onBack: () => void
  isRebooking: boolean
  formatDate: (d: string) => string
  formatTime: (t: string) => string
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Umbuchung bestätigen</h4>
        <Button variant="ghost" size="sm" onClick={onBack}>
          Anderen Termin wählen
        </Button>
      </div>

      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
        <p className="mb-2 text-sm font-medium text-green-800 dark:text-green-200">Neuer Termin</p>
        <div className="space-y-2 text-green-700 dark:text-green-300">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(slot.date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>
              {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>
              {slot.teacher?.firstName} {slot.teacher?.lastName}
            </span>
          </div>
        </div>
      </div>

      <Button className="w-full" onClick={onConfirm} disabled={isRebooking}>
        {isRebooking ? (
          'Wird umgebucht...'
        ) : (
          <>
            Termin jetzt umbuchen
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  )
}
