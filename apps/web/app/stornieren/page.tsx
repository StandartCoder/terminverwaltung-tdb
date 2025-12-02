'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  MapPin,
  RefreshCw,
  User,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { api, type BookingConfirmation, type TimeSlot } from '@/lib/api'

type ViewMode = 'details' | 'rebook'

function CancelPageContent() {
  const searchParams = useSearchParams()
  const codeFromUrl = searchParams.get('code')
  const [code, setCode] = useState(codeFromUrl || '')
  const [searchCode, setSearchCode] = useState(codeFromUrl || '')
  const [viewMode, setViewMode] = useState<ViewMode>('details')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [rebookConfirmation, setRebookConfirmation] = useState<BookingConfirmation | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (codeFromUrl) {
      setCode(codeFromUrl)
      setSearchCode(codeFromUrl)
    }
  }, [codeFromUrl])

  const {
    data: booking,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['booking-check', searchCode],
    queryFn: () => api.bookings.check(searchCode),
    enabled: searchCode.length > 10,
    retry: false,
  })

  const { data: availableDates } = useQuery({
    queryKey: ['rebook-dates'],
    queryFn: () => api.timeslots.dates(),
    enabled: viewMode === 'rebook',
  })

  const { data: availableSlots, isLoading: loadingSlots } = useQuery({
    queryKey: ['rebook-slots', selectedDate],
    queryFn: () => api.timeslots.available({ date: selectedDate || undefined }),
    enabled: !!selectedDate && viewMode === 'rebook',
  })

  const cancelMutation = useMutation({
    mutationFn: () => api.bookings.cancel(searchCode),
    onSuccess: () => {
      refetch()
      toast({
        title: 'Termin storniert',
        description: 'Der Termin wurde erfolgreich storniert.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Stornierung fehlgeschlagen',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const rebookMutation = useMutation({
    mutationFn: (newTimeSlotId: string) => api.bookings.rebook(searchCode, newTimeSlotId),
    onSuccess: (response) => {
      setRebookConfirmation(response.data)
      queryClient.invalidateQueries({ queryKey: ['rebook-slots'] })
      toast({
        title: 'Termin umgebucht',
        description: 'Der Termin wurde erfolgreich umgebucht.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Umbuchung fehlgeschlagen',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchCode(code)
    setViewMode('details')
    setRebookConfirmation(null)
  }

  const handleStartRebook = () => {
    setViewMode('rebook')
    setSelectedDate(null)
    setSelectedSlot(null)
  }

  const handleBackToDetails = () => {
    setViewMode('details')
    setSelectedDate(null)
    setSelectedSlot(null)
  }

  const handleDateSelect = (date: string) => {
    setSelectedDate(date.split('T')[0])
    setSelectedSlot(null)
  }

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot)
  }

  const handleConfirmRebook = () => {
    if (selectedSlot) {
      rebookMutation.mutate(selectedSlot.id)
    }
  }

  const formatTimeDisplay = (timeStr: string) => {
    const date = parseISO(timeStr)
    return format(date, 'HH:mm')
  }

  const formatDateDisplay = (dateStr: string) => {
    const date = parseISO(dateStr)
    return format(date, 'EEEE, d. MMMM yyyy', { locale: de })
  }

  const groupSlotsByTeacher = (slots: TimeSlot[]) => {
    const grouped: Record<string, TimeSlot[]> = {}
    slots.forEach((slot) => {
      const teacherKey = slot.teacher?.id || 'unknown'
      if (!grouped[teacherKey]) grouped[teacherKey] = []
      grouped[teacherKey].push(slot)
    })
    return grouped
  }

  // Show rebook confirmation
  if (rebookConfirmation) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
          <CardContent className="pb-8 pt-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="mt-4 text-2xl font-bold">Umbuchung erfolgreich!</h2>
              <p className="text-muted-foreground mt-2 max-w-md">
                Sie erhalten in Kürze eine Bestätigung per E-Mail mit allen Details und einem neuen
                Stornierungscode.
              </p>

              <div className="bg-card mt-8 w-full rounded-lg border p-6 text-left">
                <h3 className="mb-4 font-semibold">Neuer Termin</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="text-muted-foreground h-5 w-5" />
                    <span>{formatDateDisplay(rebookConfirmation.timeSlot.date)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="text-muted-foreground h-5 w-5" />
                    <span>
                      {formatTimeDisplay(rebookConfirmation.timeSlot.startTime)} -{' '}
                      {formatTimeDisplay(rebookConfirmation.timeSlot.endTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="text-muted-foreground h-5 w-5" />
                    <span>
                      {rebookConfirmation.teacher.firstName} {rebookConfirmation.teacher.lastName}
                    </span>
                  </div>
                  {rebookConfirmation.teacher.room && (
                    <div className="flex items-center gap-3">
                      <MapPin className="text-muted-foreground h-5 w-5" />
                      <span>Raum {rebookConfirmation.teacher.room}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 border-t pt-4">
                  <p className="text-muted-foreground text-sm">Neuer Stornierungscode:</p>
                  <code className="bg-muted mt-1 block rounded px-3 py-2 font-mono text-sm">
                    {rebookConfirmation.cancellationCode}
                  </code>
                  <p className="text-muted-foreground mt-2 text-xs">
                    Bewahren Sie diesen neuen Code auf, falls Sie den Termin erneut ändern möchten.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <Link href="/">
                  <Button variant="outline">Zur Startseite</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold tracking-tight">Termin verwalten</h2>
        <p className="text-muted-foreground mt-2">Stornieren oder umbuchen Sie Ihren Termin</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Stornierungscode</CardTitle>
          <CardDescription>Den Code finden Sie in Ihrer Bestätigungs-E-Mail</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Stornierungscode eingeben"
              className="font-mono"
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Suche...' : 'Suchen'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <XCircle className="text-destructive h-12 w-12" />
              <h3 className="mt-4 font-semibold">Buchung nicht gefunden</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Bitte überprüfen Sie Ihren Stornierungscode und versuchen Sie es erneut.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {booking?.data && viewMode === 'details' && (
        <Card>
          <CardHeader>
            <CardTitle>Gefundene Buchung</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="text-muted-foreground h-5 w-5" />
                <div>
                  <p className="text-muted-foreground text-sm">Datum</p>
                  <p className="font-medium">{formatDateDisplay(booking.data.timeSlot.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="text-muted-foreground h-5 w-5" />
                <div>
                  <p className="text-muted-foreground text-sm">Uhrzeit</p>
                  <p className="font-medium">
                    {formatTimeDisplay(booking.data.timeSlot.startTime)} -{' '}
                    {formatTimeDisplay(booking.data.timeSlot.endTime)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="text-muted-foreground h-5 w-5" />
                <div>
                  <p className="text-muted-foreground text-sm">Lehrkraft</p>
                  <p className="font-medium">
                    {booking.data.teacher.firstName} {booking.data.teacher.lastName}
                  </p>
                </div>
              </div>
              {booking.data.teacher.room && (
                <div className="flex items-center gap-3">
                  <MapPin className="text-muted-foreground h-5 w-5" />
                  <div>
                    <p className="text-muted-foreground text-sm">Raum</p>
                    <p className="font-medium">{booking.data.teacher.room}</p>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                {booking.data.status === 'CANCELLED' ? (
                  <div className="text-muted-foreground flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Dieser Termin wurde bereits storniert</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleStartRebook}
                        disabled={rebookMutation.isPending}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Termin umbuchen
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => cancelMutation.mutate()}
                        disabled={cancelMutation.isPending}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        {cancelMutation.isPending ? 'Wird storniert...' : 'Termin stornieren'}
                      </Button>
                    </div>

                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                      <div className="flex gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-500" />
                        <div>
                          <p className="font-medium text-amber-800 dark:text-amber-200">Hinweis</p>
                          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                            Bei einer Stornierung wird der Termin unwiderruflich gelöscht. Wenn Sie
                            nur einen anderen Zeitpunkt wünschen, nutzen Sie bitte die
                            Umbuchungsfunktion.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {booking?.data && viewMode === 'rebook' && booking.data.status !== 'CANCELLED' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Neuen Termin wählen</CardTitle>
                <Button variant="ghost" size="sm" onClick={handleBackToDetails}>
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
                  {formatDateDisplay(booking.data.timeSlot.date)} um{' '}
                  {formatTimeDisplay(booking.data.timeSlot.startTime)} bei{' '}
                  {booking.data.teacher.firstName} {booking.data.teacher.lastName}
                </p>
              </div>

              {/* Date selection */}
              {!selectedDate && (
                <div className="space-y-3">
                  <h4 className="font-medium">Datum auswählen</h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {availableDates?.data.map((date) => (
                      <button
                        key={date}
                        onClick={() => handleDateSelect(date)}
                        className="bg-card hover:border-primary flex items-center gap-3 rounded-lg border p-4 text-left transition-all hover:shadow-sm"
                      >
                        <Calendar className="text-primary h-5 w-5" />
                        <span className="font-medium">{formatDateDisplay(date)}</span>
                      </button>
                    ))}
                  </div>
                  {availableDates?.data.length === 0 && (
                    <p className="text-muted-foreground text-center">
                      Keine verfügbaren Termine gefunden.
                    </p>
                  )}
                </div>
              )}

              {/* Slot selection */}
              {selectedDate && !selectedSlot && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">
                      Zeitslot wählen - {formatDateDisplay(selectedDate)}
                    </h4>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>
                      Anderes Datum
                    </Button>
                  </div>

                  {loadingSlots ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="bg-muted h-24 animate-pulse rounded-lg" />
                      ))}
                    </div>
                  ) : availableSlots?.data && availableSlots.data.length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(groupSlotsByTeacher(availableSlots.data)).map(
                        ([teacherId, teacherSlots]) => {
                          const teacher = teacherSlots[0]?.teacher
                          if (!teacher) return null

                          return (
                            <div key={teacherId} className="rounded-lg border p-4">
                              <div className="mb-3 flex items-center gap-3">
                                <div
                                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-white"
                                  style={{
                                    backgroundColor: teacher.department?.color || '#3B82F6',
                                  }}
                                >
                                  {teacher.firstName[0]}
                                  {teacher.lastName[0]}
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {teacher.firstName} {teacher.lastName}
                                  </p>
                                  {teacher.room && (
                                    <p className="text-muted-foreground text-sm">
                                      Raum {teacher.room}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {teacherSlots.map((slot) => (
                                  <button
                                    key={slot.id}
                                    onClick={() => handleSlotSelect(slot)}
                                    className="bg-background hover:border-primary hover:bg-primary hover:text-primary-foreground inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all"
                                  >
                                    <Clock className="h-4 w-4" />
                                    {formatTimeDisplay(slot.startTime)} -{' '}
                                    {formatTimeDisplay(slot.endTime)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )
                        }
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground py-8 text-center">
                      Keine verfügbaren Termine an diesem Tag.
                    </p>
                  )}
                </div>
              )}

              {/* Confirmation */}
              {selectedSlot && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Umbuchung bestätigen</h4>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedSlot(null)}>
                      Anderen Termin wählen
                    </Button>
                  </div>

                  <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
                    <p className="mb-2 text-sm font-medium text-green-800 dark:text-green-200">
                      Neuer Termin
                    </p>
                    <div className="space-y-2 text-green-700 dark:text-green-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDateDisplay(selectedSlot.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {formatTimeDisplay(selectedSlot.startTime)} -{' '}
                          {formatTimeDisplay(selectedSlot.endTime)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>
                          {selectedSlot.teacher?.firstName} {selectedSlot.teacher?.lastName}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleConfirmRebook}
                    disabled={rebookMutation.isPending}
                  >
                    {rebookMutation.isPending ? (
                      'Wird umgebucht...'
                    ) : (
                      <>
                        Termin jetzt umbuchen
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href="/">
          <Button variant="outline">Zurück zur Startseite</Button>
        </Link>
      </div>
    </div>
  )
}

export default function CancelPage() {
  return (
    <div className="from-background to-muted/30 min-h-screen bg-gradient-to-b">
      <header className="bg-card/80 sticky top-0 z-50 border-b backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-lg">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-none">OSZ Teltow</h1>
              <p className="text-muted-foreground text-sm">Tag der Betriebe</p>
            </div>
          </Link>
        </div>
      </header>

      <main className="container py-8 md:py-12">
        <Suspense
          fallback={
            <div className="mx-auto max-w-lg">
              <div className="bg-muted h-64 animate-pulse rounded-xl" />
            </div>
          }
        >
          <CancelPageContent />
        </Suspense>
      </main>
    </div>
  )
}
