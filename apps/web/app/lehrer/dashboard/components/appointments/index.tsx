'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MoreVertical,
  Plus,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import { useState, useEffect, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { api, type TimeSlot } from '@/lib/api'

interface AppointmentsTabProps {
  teacherId: string
}

function SlotRowMenu({
  slot,
  onToggleStatus,
  onDelete,
}: {
  slot: TimeSlot
  onToggleStatus: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, right: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      })
    }
    setOpen(!open)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-1.5 transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div
          className="bg-popover fixed z-50 w-44 rounded-lg border py-1 shadow-lg"
          style={{ top: position.top, right: position.right }}
        >
          <button
            onClick={() => {
              setOpen(false)
              onToggleStatus()
            }}
            className="hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors"
          >
            {slot.status === 'AVAILABLE' ? (
              <>
                <XCircle className="h-4 w-4" />
                Blockieren
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Freigeben
              </>
            )}
          </button>
          <button
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
            className="hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 transition-colors dark:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
            Löschen
          </button>
        </div>
      )}
    </div>
  )
}

export function AppointmentsTab({ teacherId }: AppointmentsTabProps) {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [showBulkCreate, setShowBulkCreate] = useState(false)
  const [showSingleCreate, setShowSingleCreate] = useState(false)

  // Single slot form
  const [singleDate, setSingleDate] = useState('')
  const [singleStart, setSingleStart] = useState('08:00')
  const [singleEnd, setSingleEnd] = useState('08:30')

  // Bulk create form
  const [bulkDate, setBulkDate] = useState('')
  const [bulkStartTime, setBulkStartTime] = useState('')
  const [bulkEndTime, setBulkEndTime] = useState('')
  const [bulkDuration, setBulkDuration] = useState(20)
  const [bulkBuffer, setBulkBuffer] = useState(0)

  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Fetch active event to validate date range
  const { data: activeEventData } = useQuery({
    queryKey: ['activeEvent'],
    queryFn: () => api.events.getActive(),
    retry: false,
  })

  const activeEvent = activeEventData?.data
  const hasActiveEvent = !!activeEvent

  // Get event date range for input constraints
  const eventDateRange = useMemo(() => {
    if (!activeEvent) return { min: '', max: '' }
    return {
      min: activeEvent.startDate.split('T')[0],
      max: activeEvent.endDate.split('T')[0],
    }
  }, [activeEvent])

  // Set selectedDate to event start date when event loads
  useEffect(() => {
    if (activeEvent && !selectedDate) {
      setSelectedDate(activeEvent.startDate.split('T')[0])
    }
  }, [activeEvent, selectedDate])

  // Check if a date is within the event range
  const isDateInEventRange = (dateStr: string): boolean => {
    if (!activeEvent || !dateStr) return false
    const date = new Date(dateStr)
    const start = new Date(activeEvent.startDate)
    const end = new Date(activeEvent.endDate)
    date.setHours(0, 0, 0, 0)
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    return date >= start && date <= end
  }

  // Fetch settings for defaults
  const { data: settingsData } = useQuery({
    queryKey: ['timeslot-settings'],
    queryFn: () => api.timeslots.settings(),
  })

  // Set defaults when settings load
  useEffect(() => {
    if (settingsData?.data) {
      setBulkStartTime(settingsData.data.dayStartTime)
      setBulkEndTime(settingsData.data.dayEndTime)
      setBulkDuration(settingsData.data.slotDurationMinutes)
      setBulkBuffer(settingsData.data.slotBufferMinutes)
    }
  }, [settingsData])

  // Fetch slots for selected date
  const { data: slotsData, isLoading: loadingSlots } = useQuery({
    queryKey: ['teacher-slots', teacherId, selectedDate],
    queryFn: () => api.timeslots.list({ teacherId, date: selectedDate }),
    enabled: !!teacherId && !!selectedDate,
  })

  // Fetch bookings
  const { data: bookingsData } = useQuery({
    queryKey: ['teacher-bookings', teacherId],
    queryFn: () => api.bookings.list({ teacherId, status: 'CONFIRMED' }),
    enabled: !!teacherId,
  })

  const slots = useMemo(() => slotsData?.data || [], [slotsData?.data])
  const confirmedBookings = useMemo(
    () => bookingsData?.data?.filter((b) => b.status === 'CONFIRMED') || [],
    [bookingsData?.data]
  )

  // Stats
  const stats = useMemo(() => {
    const available = slots.filter((s) => s.status === 'AVAILABLE').length
    const booked = slots.filter((s) => s.status === 'BOOKED').length
    const blocked = slots.filter((s) => s.status === 'BLOCKED').length
    return { available, booked, blocked, total: slots.length }
  }, [slots])

  // Create single slot
  const createSlotMutation = useMutation({
    mutationFn: () =>
      api.timeslots.create({
        teacherId,
        date: singleDate,
        startTime: singleStart,
        endTime: singleEnd,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-slots'] })
      toast({ title: 'Erstellt', description: 'Zeitslot wurde erstellt.' })
      setShowSingleCreate(false)
      setSingleDate('')
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    },
  })

  // Generate bulk slots
  const generateSlotsMutation = useMutation({
    mutationFn: () =>
      api.timeslots.generate({
        teacherId,
        date: bulkDate,
        startTime: bulkStartTime,
        endTime: bulkEndTime,
        slotDurationMinutes: bulkDuration,
        slotBufferMinutes: bulkBuffer,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-slots'] })
      toast({
        title: 'Termine erstellt',
        description: `${data.count} Zeitslots wurden erstellt.`,
      })
      setShowBulkCreate(false)
      setBulkDate('')
      // Update selected date to show the new slots
      setSelectedDate(bulkDate)
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    },
  })

  // Toggle slot status
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'AVAILABLE' | 'BLOCKED' }) =>
      api.timeslots.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-slots'] })
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    },
  })

  // Delete slot
  const deleteSlotMutation = useMutation({
    mutationFn: (id: string) => api.timeslots.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-slots'] })
      toast({ title: 'Gelöscht', description: 'Zeitslot wurde gelöscht.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    },
  })

  const formatTime = (t: string) => format(parseISO(t), 'HH:mm')
  const formatDateFull = (d: string) => format(parseISO(d), 'EEEE, d. MMMM yyyy', { locale: de })
  const formatDateShort = (d: string) => format(parseISO(d), 'd. MMM', { locale: de })

  // Calculate preview slots for bulk creation
  const previewSlots = useMemo(() => {
    if (!bulkStartTime || !bulkEndTime || !bulkDuration) return []

    const [startHour, startMin] = bulkStartTime.split(':').map(Number)
    const [endHour, endMin] = bulkEndTime.split(':').map(Number)
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    const slots: { start: string; end: string }[] = []
    let currentMinutes = startMinutes

    while (currentMinutes + bulkDuration <= endMinutes) {
      const slotStartHour = Math.floor(currentMinutes / 60)
      const slotStartMin = currentMinutes % 60
      const slotEndMinutes = currentMinutes + bulkDuration
      const slotEndHour = Math.floor(slotEndMinutes / 60)
      const slotEndMin = slotEndMinutes % 60

      slots.push({
        start: `${slotStartHour.toString().padStart(2, '0')}:${slotStartMin.toString().padStart(2, '0')}`,
        end: `${slotEndHour.toString().padStart(2, '0')}:${slotEndMin.toString().padStart(2, '0')}`,
      })

      currentMinutes += bulkDuration + bulkBuffer
    }

    return slots
  }, [bulkStartTime, bulkEndTime, bulkDuration, bulkBuffer])

  // Navigate date
  const navigateDate = (days: number) => {
    if (!selectedDate) return
    const current = parseISO(selectedDate)
    current.setDate(current.getDate() + days)
    const newDate = format(current, 'yyyy-MM-dd')
    // Clamp to event date range
    if (eventDateRange.min && newDate < eventDateRange.min) return
    if (eventDateRange.max && newDate > eventDateRange.max) return
    setSelectedDate(newDate)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Meine Termine</h2>
          <p className="text-muted-foreground">Verwalten Sie Ihre verfügbaren Zeitslots</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowSingleCreate(true)}
            disabled={!hasActiveEvent}
            title={!hasActiveEvent ? 'Keine aktive Veranstaltung' : undefined}
          >
            <Plus className="mr-2 h-4 w-4" />
            Einzeln
          </Button>
          <Button
            onClick={() => setShowBulkCreate(true)}
            disabled={!hasActiveEvent}
            title={!hasActiveEvent ? 'Keine aktive Veranstaltung' : undefined}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Termine generieren
          </Button>
        </div>
      </div>

      {/* No active event warning */}
      {!hasActiveEvent && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Keine aktive Veranstaltung
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Zeitslots können nur erstellt werden, wenn eine Veranstaltung aktiv ist.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                <Calendar className="text-primary h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-muted-foreground text-xs">Gesamt</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.available}</p>
                <p className="text-muted-foreground text-xs">Verfügbar</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.booked}</p>
                <p className="text-muted-foreground text-xs">Gebucht</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                <XCircle className="text-muted-foreground h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.blocked}</p>
                <p className="text-muted-foreground text-xs">Blockiert</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Single Create Modal */}
      {showSingleCreate && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Einzelnen Termin erstellen</CardTitle>
                <CardDescription>Erstellen Sie einen einzelnen Zeitslot manuell</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowSingleCreate(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Datum</Label>
                <Input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  min={eventDateRange.min}
                  max={eventDateRange.max}
                />
                {singleDate && !isDateInEventRange(singleDate) && (
                  <p className="text-xs text-amber-600">
                    Datum liegt außerhalb des Veranstaltungszeitraums
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Startzeit</Label>
                <Input
                  type="time"
                  value={singleStart}
                  onChange={(e) => setSingleStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Endzeit</Label>
                <Input
                  type="time"
                  value={singleEnd}
                  onChange={(e) => setSingleEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => createSlotMutation.mutate()}
                disabled={
                  !singleDate || !isDateInEventRange(singleDate) || createSlotMutation.isPending
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                {createSlotMutation.isPending ? 'Erstelle...' : 'Erstellen'}
              </Button>
              <Button variant="ghost" onClick={() => setShowSingleCreate(false)}>
                Abbrechen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Create Modal */}
      {showBulkCreate && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5" />
                  Termine automatisch generieren
                </CardTitle>
                <CardDescription>
                  Erstellen Sie mehrere Zeitslots auf einmal basierend auf Ihren Einstellungen
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowBulkCreate(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label>Datum *</Label>
                <Input
                  type="date"
                  value={bulkDate}
                  onChange={(e) => setBulkDate(e.target.value)}
                  min={eventDateRange.min}
                  max={eventDateRange.max}
                />
                {bulkDate && !isDateInEventRange(bulkDate) && (
                  <p className="text-xs text-amber-600">
                    Datum liegt außerhalb des Veranstaltungszeitraums
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Von</Label>
                <Input
                  type="time"
                  value={bulkStartTime}
                  onChange={(e) => setBulkStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Bis</Label>
                <Input
                  type="time"
                  value={bulkEndTime}
                  onChange={(e) => setBulkEndTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Dauer (Min)</Label>
                <Input
                  type="number"
                  min={5}
                  max={120}
                  value={bulkDuration}
                  onChange={(e) => setBulkDuration(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Pause (Min)</Label>
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={bulkBuffer}
                  onChange={(e) => setBulkBuffer(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Preview */}
            {previewSlots.length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  Vorschau: {previewSlots.length} Termine werden erstellt
                </Label>
                <div className="flex flex-wrap gap-2">
                  {previewSlots.map((slot, i) => (
                    <span key={i} className="bg-muted rounded-md px-2 py-1 text-xs font-medium">
                      {slot.start} - {slot.end}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => generateSlotsMutation.mutate()}
                disabled={
                  !bulkDate ||
                  !isDateInEventRange(bulkDate) ||
                  previewSlots.length === 0 ||
                  generateSlotsMutation.isPending
                }
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {generateSlotsMutation.isPending
                  ? 'Generiere...'
                  : `${previewSlots.length} Termine erstellen`}
              </Button>
              <Button variant="ghost" onClick={() => setShowBulkCreate(false)}>
                Abbrechen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Slots List */}
        <div className="lg:col-span-2">
          <Card>
            {hasActiveEvent ? (
              <>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle>Zeitslots</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigateDate(-1)}
                        disabled={!selectedDate || selectedDate <= eventDateRange.min}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Input
                        type="date"
                        className="w-auto"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={eventDateRange.min}
                        max={eventDateRange.max}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigateDate(1)}
                        disabled={!selectedDate || selectedDate >= eventDateRange.max}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {selectedDate && (
                    <CardDescription>{formatDateFull(selectedDate)}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {loadingSlots ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-muted h-14 animate-pulse rounded-lg" />
                      ))}
                    </div>
                  ) : slots.length > 0 ? (
                    <div className="space-y-2">
                      {slots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`flex items-center justify-between rounded-lg border p-3 transition-all ${
                            slot.status === 'BOOKED'
                              ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20'
                              : slot.status === 'BLOCKED'
                                ? 'bg-muted/50 border-dashed'
                                : 'bg-card hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-lg font-semibold">{formatTime(slot.startTime)}</p>
                              <p className="text-muted-foreground text-xs">
                                bis {formatTime(slot.endTime)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {slot.status === 'BOOKED' && (
                                <>
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Gebucht
                                  </span>
                                  {slot.booking && (
                                    <span className="text-muted-foreground text-sm">
                                      {slot.booking.companyName}
                                    </span>
                                  )}
                                </>
                              )}
                              {slot.status === 'BLOCKED' && (
                                <span className="text-muted-foreground inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium dark:bg-gray-800">
                                  <XCircle className="h-3 w-3" />
                                  Blockiert
                                </span>
                              )}
                              {slot.status === 'AVAILABLE' && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                  <Clock className="h-3 w-3" />
                                  Verfügbar
                                </span>
                              )}
                            </div>
                          </div>
                          {slot.status !== 'BOOKED' && (
                            <SlotRowMenu
                              slot={slot}
                              onToggleStatus={() =>
                                toggleStatusMutation.mutate({
                                  id: slot.id,
                                  status: slot.status === 'AVAILABLE' ? 'BLOCKED' : 'AVAILABLE',
                                })
                              }
                              onDelete={() => deleteSlotMutation.mutate(slot.id)}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted-foreground py-12 text-center">
                      <AlertCircle className="mx-auto mb-4 h-12 w-12 opacity-50" />
                      <p className="mb-4">Keine Termine für diesen Tag</p>
                      <Button variant="outline" onClick={() => setShowBulkCreate(true)}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Termine generieren
                      </Button>
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader>
                  <CardTitle>Zeitslots</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-muted-foreground py-12 text-center">
                    <Calendar className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>Keine aktive Veranstaltung vorhanden</p>
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        </div>

        {/* Upcoming Bookings */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Kommende Buchungen</CardTitle>
              <CardDescription>Ihre bestätigten Termine</CardDescription>
            </CardHeader>
            <CardContent>
              {confirmedBookings.length > 0 ? (
                <div className="space-y-3">
                  {confirmedBookings.slice(0, 5).map((booking) => (
                    <div key={booking.id} className="flex items-start gap-3 rounded-lg border p-3">
                      <div className="bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                        <Building2 className="text-primary h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{booking.companyName}</p>
                        <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
                          <span>{formatDateShort(booking.timeSlot.date)}</span>
                          <span>·</span>
                          <span>{formatTime(booking.timeSlot.startTime)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {confirmedBookings.length > 5 && (
                    <p className="text-muted-foreground text-center text-sm">
                      +{confirmedBookings.length - 5} weitere
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground py-8 text-center">
                  <Calendar className="mx-auto mb-3 h-10 w-10 opacity-50" />
                  <p className="text-sm">Noch keine Buchungen</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
