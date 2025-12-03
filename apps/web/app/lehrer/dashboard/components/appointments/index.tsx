'use client'

import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { AlertCircle, Building2, Calendar, CheckCircle2, Clock, Plus, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Booking, TimeSlot } from '@/lib/api'

interface AppointmentsTabProps {
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

export function AppointmentsTab({
  slots,
  loadingSlots,
  confirmedBookings,
  selectedDate,
  setSelectedDate,
  newSlotDate,
  setNewSlotDate,
  newSlotStart,
  setNewSlotStart,
  newSlotEnd,
  setNewSlotEnd,
  onCreateSlot,
  onToggleStatus,
  onDeleteSlot,
  isCreating,
}: AppointmentsTabProps) {
  const formatTime = (t: string) => format(parseISO(t), 'HH:mm')
  const formatDateShort = (d: string) => format(parseISO(d), 'd. MMM', { locale: de })

  const availableSlots = slots.filter((s) => s.status === 'AVAILABLE')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Meine Termine</h2>
        <p className="text-muted-foreground">Verwalten Sie Ihre verfügbaren Zeitslots</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl">
                    <Calendar className="text-primary h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{availableSlots.length}</p>
                    <p className="text-muted-foreground text-sm">Verfügbare Termine</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{confirmedBookings.length}</p>
                    <p className="text-muted-foreground text-sm">Bestätigte Buchungen</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Create Slot Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Neuen Termin erstellen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Datum</Label>
                <Input
                  type="date"
                  value={newSlotDate}
                  onChange={(e) => setNewSlotDate(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start</Label>
                  <Input
                    type="time"
                    value={newSlotStart}
                    onChange={(e) => setNewSlotStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ende</Label>
                  <Input
                    type="time"
                    value={newSlotEnd}
                    onChange={(e) => setNewSlotEnd(e.target.value)}
                  />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={onCreateSlot}
                disabled={!newSlotDate || isCreating}
              >
                <Plus className="mr-2 h-4 w-4" />
                {isCreating ? 'Erstelle...' : 'Termin erstellen'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          {/* Slots List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Meine Zeitslots</CardTitle>
                <Input
                  type="date"
                  className="w-auto"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {loadingSlots ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-muted h-16 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : slots && slots.length > 0 ? (
                <div className="space-y-2">
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`flex items-center justify-between rounded-lg border p-4 transition-all ${slot.status === 'BOOKED' ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20' : slot.status === 'BLOCKED' ? 'bg-muted/50' : 'bg-card hover:shadow-sm'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-muted-foreground text-sm">
                            {formatDateShort(slot.date)}
                          </p>
                          <p className="font-semibold">
                            {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                          </p>
                        </div>
                        {slot.status === 'BOOKED' && (
                          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm">Gebucht</span>
                          </div>
                        )}
                        {slot.status === 'BLOCKED' && (
                          <div className="text-muted-foreground flex items-center gap-2">
                            <XCircle className="h-4 w-4" />
                            <span className="text-sm">Blockiert</span>
                          </div>
                        )}
                        {slot.status === 'AVAILABLE' && (
                          <div className="text-primary flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm">Verfügbar</span>
                          </div>
                        )}
                      </div>
                      {slot.status !== 'BOOKED' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              onToggleStatus(
                                slot.id,
                                slot.status === 'AVAILABLE' ? 'BLOCKED' : 'AVAILABLE'
                              )
                            }
                          >
                            {slot.status === 'AVAILABLE' ? 'Blockieren' : 'Freigeben'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => onDeleteSlot(slot.id)}
                          >
                            Löschen
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground py-12 text-center">
                  <AlertCircle className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>Keine Termine gefunden</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bookings List */}
          <Card>
            <CardHeader>
              <CardTitle>Bestätigte Buchungen</CardTitle>
              <CardDescription>Ihre kommenden Gespräche mit Betrieben</CardDescription>
            </CardHeader>
            <CardContent>
              {confirmedBookings.length > 0 ? (
                <div className="space-y-4">
                  {confirmedBookings.map((booking) => (
                    <div key={booking.id} className="flex items-start gap-4 rounded-lg border p-4">
                      <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                        <Building2 className="text-primary h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{booking.companyName}</p>
                        <p className="text-muted-foreground text-sm">{booking.contactName}</p>
                        <div className="mt-2 flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDateShort(booking.timeSlot.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatTime(booking.timeSlot.startTime)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground py-12 text-center">
                  <Calendar className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>Noch keine Buchungen</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
