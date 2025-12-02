'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, isToday, isTomorrow, parseISO, isAfter, isBefore } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  AlertCircle,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Phone,
  Plus,
  Printer,
  Save,
  TrendingUp,
  User,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { api, type Booking, type Setting, type Teacher, type TimeSlot } from '@/lib/api'
import { useRequireAuth } from '@/lib/auth'
import { DepartmentsManagement } from './components/departments-management'
import { EventsManagement } from './components/events-management'
import { Sidebar, type AdminTab } from './components/sidebar'
import { TeachersManagement } from './components/teachers-management'

export default function DashboardPage() {
  const { teacher, isLoading, logout } = useRequireAuth()
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [newSlotDate, setNewSlotDate] = useState('')
  const [newSlotStart, setNewSlotStart] = useState('08:00')
  const [newSlotEnd, setNewSlotEnd] = useState('08:20')
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: slots, isLoading: loadingSlots } = useQuery({
    queryKey: ['teacher-slots', teacher?.id, selectedDate],
    queryFn: () => api.timeslots.list({ teacherId: teacher?.id, date: selectedDate || undefined }),
    enabled: !!teacher?.id,
  })

  const { data: bookings } = useQuery({
    queryKey: ['teacher-bookings', teacher?.id],
    queryFn: () => api.bookings.list({ teacherId: teacher?.id, status: 'CONFIRMED' }),
    enabled: !!teacher?.id,
  })

  const { data: statistics } = useQuery({
    queryKey: ['statistics'],
    queryFn: () => api.export.statistics(),
    enabled: !!teacher?.isAdmin,
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.departments.list(),
  })

  const { data: allTeachers } = useQuery({
    queryKey: ['all-teachers'],
    queryFn: () => api.teachers.list(),
    enabled: !!teacher?.isAdmin,
  })

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.events.list(),
    enabled: !!teacher?.isAdmin,
  })

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.list(),
    enabled: !!teacher?.isAdmin,
  })

  const createSlotMutation = useMutation({
    mutationFn: () =>
      api.timeslots.create({
        teacherId: teacher!.id,
        date: newSlotDate,
        startTime: newSlotStart,
        endTime: newSlotEnd,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-slots'] })
      queryClient.invalidateQueries({ queryKey: ['teacher-bookings'] })
      toast({ title: 'Erstellt', description: 'Zeitslot wurde erstellt.' })
      setNewSlotDate('')
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    },
  })

  const toggleSlotStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'AVAILABLE' | 'BLOCKED' }) =>
      api.timeslots.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacher-slots'] }),
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    },
  })

  const deleteSlot = useMutation({
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
  const formatDateShort = (d: string) => format(parseISO(d), 'd. MMM', { locale: de })

  if (isLoading || !teacher) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground">Wird geladen...</p>
        </div>
      </div>
    )
  }

  const confirmedBookings = bookings?.data?.filter((b) => b.status === 'CONFIRMED') || []

  return (
    <div className="bg-muted/30 min-h-screen">
      <Sidebar
        teacher={teacher}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={logout}
      />

      <main className="pl-64">
        <div className="p-8">
          {activeTab === 'overview' && (
            <OverviewTab
              teacher={teacher}
              statistics={statistics?.data}
              bookings={confirmedBookings}
            />
          )}

          {activeTab === 'appointments' && (
            <AppointmentsTab
              slots={slots?.data || []}
              loadingSlots={loadingSlots}
              confirmedBookings={confirmedBookings}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              newSlotDate={newSlotDate}
              setNewSlotDate={setNewSlotDate}
              newSlotStart={newSlotStart}
              setNewSlotStart={setNewSlotStart}
              newSlotEnd={newSlotEnd}
              setNewSlotEnd={setNewSlotEnd}
              onCreateSlot={() => createSlotMutation.mutate()}
              onToggleStatus={(id: string, status: 'AVAILABLE' | 'BLOCKED') =>
                toggleSlotStatus.mutate({ id, status })
              }
              onDeleteSlot={(id: string) => deleteSlot.mutate(id)}
              isCreating={createSlotMutation.isPending}
              formatTime={formatTime}
              formatDateShort={formatDateShort}
            />
          )}

          {activeTab === 'events' && teacher.isAdmin && (
            <EventsManagement events={events?.data || []} />
          )}

          {activeTab === 'departments' && teacher.isAdmin && (
            <DepartmentsManagement departments={departments?.data || []} />
          )}

          {activeTab === 'teachers' && teacher.isAdmin && (
            <TeachersManagement
              teachers={allTeachers?.data || []}
              departments={departments?.data || []}
            />
          )}

          {activeTab === 'settings' && teacher.isAdmin && (
            <SettingsTab
              settings={settingsData?.data || []}
              settingsMap={settingsData?.map || {}}
            />
          )}
        </div>
      </main>
    </div>
  )
}

function OverviewTab({
  teacher,
  statistics,
  bookings,
}: {
  teacher: Teacher
  statistics?: {
    bookings: { total: number; confirmed: number; cancelled: number }
    timeSlots: { total: number; available: number; booked: number; utilizationRate: string }
    teachers: number
    companies: number
  }
  bookings: Booking[]
}) {
  // Use a stable time reference that updates on each render but doesn't cause infinite loops
  const now = useMemo(() => new Date(), [])

  const { currentAppointment, nextAppointment, todayBookings, tomorrowBookings } = useMemo(() => {
    const sorted = [...bookings].sort((a, b) => {
      const dateA = new Date(
        `${a.timeSlot.date.split('T')[0]}T${a.timeSlot.startTime.split('T')[1] || '00:00:00'}`
      )
      const dateB = new Date(
        `${b.timeSlot.date.split('T')[0]}T${b.timeSlot.startTime.split('T')[1] || '00:00:00'}`
      )
      return dateA.getTime() - dateB.getTime()
    })

    let current: Booking | null = null
    let next: Booking | null = null
    const today: Booking[] = []
    const tomorrow: Booking[] = []

    for (const booking of sorted) {
      const slotDate = parseISO(booking.timeSlot.date)
      const startTime = parseISO(booking.timeSlot.startTime)
      const endTime = parseISO(booking.timeSlot.endTime)

      const slotStart = new Date(slotDate)
      slotStart.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0)

      const slotEnd = new Date(slotDate)
      slotEnd.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0)

      if (isToday(slotDate)) {
        today.push(booking)
        if (!current && isAfter(now, slotStart) && isBefore(now, slotEnd)) {
          current = booking
        } else if (!next && isAfter(slotStart, now)) {
          next = booking
        }
      } else if (isTomorrow(slotDate)) {
        tomorrow.push(booking)
        if (!next) {
          next = booking
        }
      } else if (isAfter(slotDate, now) && !next) {
        next = booking
      }
    }

    return {
      currentAppointment: current,
      nextAppointment: next,
      todayBookings: today,
      tomorrowBookings: tomorrow,
    }
  }, [bookings, now])

  const formatTime = (t: string) => format(parseISO(t), 'HH:mm')
  const formatDateFull = (d: string) => format(parseISO(d), 'EEEE, d. MMMM', { locale: de })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Guten {now.getHours() < 12 ? 'Morgen' : now.getHours() < 18 ? 'Tag' : 'Abend'},{' '}
            {teacher.firstName}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(now, 'EEEE, d. MMMM yyyy', { locale: de })}
          </p>
        </div>
      </div>

      {/* Current & Next Appointment - Featured Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current Appointment */}
        <Card
          className={`relative overflow-hidden ${currentAppointment ? 'border-green-500 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent' : 'border-dashed'}`}
        >
          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-green-500/10" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${currentAppointment ? 'bg-green-500 text-white' : 'bg-muted'}`}
              >
                <Clock className="h-4 w-4" />
              </div>
              <CardTitle className="text-lg">Aktueller Termin</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {currentAppointment ? (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-500 text-white shadow-lg shadow-green-500/30">
                    <Building2 className="h-7 w-7" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xl font-bold">{currentAppointment.companyName}</p>
                    <p className="text-muted-foreground">{currentAppointment.contactName}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="text-muted-foreground h-4 w-4" />
                    <span className="font-medium">
                      {formatTime(currentAppointment.timeSlot.startTime)} -{' '}
                      {formatTime(currentAppointment.timeSlot.endTime)}
                    </span>
                  </div>
                  {currentAppointment.studentName && (
                    <div className="flex items-center gap-2">
                      <User className="text-muted-foreground h-4 w-4" />
                      <span>
                        {currentAppointment.studentName}
                        {currentAppointment.studentClass && ` (${currentAppointment.studentClass})`}
                      </span>
                    </div>
                  )}
                  {currentAppointment.companyPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="text-muted-foreground h-4 w-4" />
                      <span>{currentAppointment.companyPhone}</span>
                    </div>
                  )}
                </div>
                {currentAppointment.notes && (
                  <p className="bg-muted/50 rounded-lg p-3 text-sm">{currentAppointment.notes}</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="bg-muted mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                  <CalendarClock className="text-muted-foreground h-6 w-6" />
                </div>
                <p className="text-muted-foreground">Kein laufender Termin</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Appointment */}
        <Card
          className={`relative overflow-hidden ${nextAppointment ? 'border-blue-500 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent' : 'border-dashed'}`}
        >
          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-blue-500/10" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${nextAppointment ? 'bg-blue-500 text-white' : 'bg-muted'}`}
              >
                <ChevronRight className="h-4 w-4" />
              </div>
              <CardTitle className="text-lg">Nächster Termin</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {nextAppointment ? (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/30">
                    <Building2 className="h-7 w-7" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xl font-bold">{nextAppointment.companyName}</p>
                    <p className="text-muted-foreground">{nextAppointment.contactName}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="text-muted-foreground h-4 w-4" />
                    <span>{formatDateFull(nextAppointment.timeSlot.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="text-muted-foreground h-4 w-4" />
                    <span className="font-medium">
                      {formatTime(nextAppointment.timeSlot.startTime)} -{' '}
                      {formatTime(nextAppointment.timeSlot.endTime)}
                    </span>
                  </div>
                </div>
                {nextAppointment.studentName && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="text-muted-foreground h-4 w-4" />
                    <span>
                      {nextAppointment.studentName}
                      {nextAppointment.studentClass && ` (${nextAppointment.studentClass})`}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="bg-muted mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                  <Calendar className="text-muted-foreground h-6 w-6" />
                </div>
                <p className="text-muted-foreground">Keine weiteren Termine</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      {todayBookings.length > 0 && (
        <Card>
          <CardHeader className="border-b bg-gradient-to-r from-amber-500/10 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Heute</CardTitle>
                  <CardDescription>{todayBookings.length} Termine</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {todayBookings.map((booking) => {
                const slotDate = parseISO(booking.timeSlot.date)
                const startTime = parseISO(booking.timeSlot.startTime)
                const endTime = parseISO(booking.timeSlot.endTime)
                const slotStart = new Date(slotDate)
                slotStart.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0)
                const slotEnd = new Date(slotDate)
                slotEnd.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0)

                const isCurrent = isAfter(now, slotStart) && isBefore(now, slotEnd)
                const isPast = isAfter(now, slotEnd)

                return (
                  <div
                    key={booking.id}
                    className={`flex items-center gap-4 p-4 transition-colors ${isCurrent ? 'bg-green-50 dark:bg-green-950/20' : isPast ? 'bg-muted/30 opacity-60' : 'hover:bg-muted/50'}`}
                  >
                    <div className="flex w-20 flex-col items-center">
                      <span
                        className={`text-lg font-bold ${isCurrent ? 'text-green-600' : isPast ? 'text-muted-foreground' : ''}`}
                      >
                        {formatTime(booking.timeSlot.startTime)}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {formatTime(booking.timeSlot.endTime)}
                      </span>
                    </div>
                    <div
                      className={`h-12 w-1 rounded-full ${isCurrent ? 'bg-green-500' : isPast ? 'bg-muted' : 'bg-blue-500'}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold">{booking.companyName}</p>
                        {isCurrent && (
                          <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-medium text-white">
                            Jetzt
                          </span>
                        )}
                        {isPast && (
                          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                            Beendet
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground truncate text-sm">
                        {booking.contactName}
                        {booking.studentName && ` - ${booking.studentName}`}
                      </p>
                    </div>
                    {booking.companyPhone && (
                      <div className="text-muted-foreground hidden items-center gap-1.5 text-sm md:flex">
                        <Phone className="h-3.5 w-3.5" />
                        {booking.companyPhone}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tomorrow's Schedule */}
      {tomorrowBookings.length > 0 && (
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-xl">
                <Calendar className="text-primary h-5 w-5" />
              </div>
              <div>
                <CardTitle>Morgen</CardTitle>
                <CardDescription>{tomorrowBookings.length} Termine</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {tomorrowBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="hover:bg-muted/50 flex items-center gap-4 p-4 transition-colors"
                >
                  <div className="flex w-20 flex-col items-center">
                    <span className="text-lg font-bold">
                      {formatTime(booking.timeSlot.startTime)}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatTime(booking.timeSlot.endTime)}
                    </span>
                  </div>
                  <div className="bg-primary h-12 w-1 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{booking.companyName}</p>
                    <p className="text-muted-foreground truncate text-sm">
                      {booking.contactName}
                      {booking.studentName && ` - ${booking.studentName}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No appointments message for non-admins */}
      {!teacher.isAdmin && todayBookings.length === 0 && tomorrowBookings.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <Calendar className="text-muted-foreground h-8 w-8" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Keine anstehenden Termine</h2>
            <p className="text-muted-foreground text-center">
              Sie haben heute und morgen keine gebuchten Termine.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Admin Statistics & Exports */}
      {teacher.isAdmin && statistics && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-blue-200 bg-gradient-to-br from-blue-500/10 to-blue-500/5 dark:border-blue-900">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/30">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Buchungen</p>
                    <p className="text-3xl font-bold">{statistics.bookings.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-gradient-to-br from-green-500/10 to-green-500/5 dark:border-green-900">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500 text-white shadow-lg shadow-green-500/30">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Bestätigt</p>
                    <p className="text-3xl font-bold">{statistics.bookings.confirmed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-gradient-to-br from-purple-500/10 to-purple-500/5 dark:border-purple-900">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500 text-white shadow-lg shadow-purple-500/30">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Auslastung</p>
                    <p className="text-3xl font-bold">{statistics.timeSlots.utilizationRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-gradient-to-br from-orange-500/10 to-orange-500/5 dark:border-orange-900">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/30">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Betriebe</p>
                    <p className="text-3xl font-bold">{statistics.companies}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Export Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Datenexport
              </CardTitle>
              <CardDescription>
                Exportieren Sie Buchungen und Terminlisten als CSV oder druckbare Übersicht
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <FileText className="text-muted-foreground h-5 w-5" />
                    <h4 className="font-medium">CSV Export</h4>
                  </div>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Tabellendaten für Excel oder andere Anwendungen
                  </p>
                  <div className="flex flex-col gap-2">
                    <a href={api.export.bookingsCsvUrl({ status: 'CONFIRMED' })} download>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Download className="mr-2 h-4 w-4" />
                        Bestätigte Buchungen
                      </Button>
                    </a>
                    <a href={api.export.bookingsCsvUrl()} download>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Download className="mr-2 h-4 w-4" />
                        Alle Buchungen
                      </Button>
                    </a>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Printer className="text-muted-foreground h-5 w-5" />
                    <h4 className="font-medium">Druckbare Listen</h4>
                  </div>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Optimiert zum Ausdrucken oder als PDF speichern
                  </p>
                  <div className="flex flex-col gap-2">
                    <a
                      href={api.export.bookingsPrintUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Printer className="mr-2 h-4 w-4" />
                        Terminlisten (pro Lehrkraft)
                      </Button>
                    </a>
                    <a
                      href={api.export.bookingsOverviewPrintUrl({ status: 'CONFIRMED' })}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Printer className="mr-2 h-4 w-4" />
                        Buchungsübersicht
                      </Button>
                    </a>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <CalendarClock className="text-muted-foreground h-5 w-5" />
                    <h4 className="font-medium">Zeitslot-Übersicht</h4>
                  </div>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Verfügbarkeit aller Lehrkräfte
                  </p>
                  <div className="flex flex-col gap-2">
                    <a
                      href={api.export.timeslotsPrintUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Printer className="mr-2 h-4 w-4" />
                        Alle Zeitslots
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

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
  formatTime: (t: string) => string
  formatDateShort: (d: string) => string
}

function AppointmentsTab({
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
  formatTime,
  formatDateShort,
}: AppointmentsTabProps) {
  const availableSlots = slots.filter((s) => s.status === 'AVAILABLE')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Meine Termine</h2>
        <p className="text-muted-foreground">Verwalten Sie Ihre verfügbaren Zeitslots</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
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

function SettingsTab({
  settings,
  settingsMap,
}: {
  settings: Setting[]
  settingsMap: Record<string, string>
}) {
  const [values, setValues] = useState(settingsMap)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: () =>
      api.settings.bulkUpdate(Object.entries(values).map(([key, value]) => ({ key, value }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast({ title: 'Gespeichert', description: 'Einstellungen wurden gespeichert.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    },
  })

  const settingsConfig = [
    { key: 'school_email', label: 'Schul-E-Mail', type: 'email' },
    { key: 'booking_enabled', label: 'Buchungen aktiviert', type: 'boolean' },
    { key: 'email_notifications', label: 'E-Mail-Benachrichtigungen', type: 'boolean' },
    { key: 'slot_duration_minutes', label: 'Standard-Terminlänge (Min.)', type: 'number' },
    { key: 'large_company_threshold', label: 'Großbetrieb ab (Azubis)', type: 'number' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Einstellungen</h2>
          <p className="text-muted-foreground">Systemweite Konfiguration</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {saveMutation.isPending ? 'Speichere...' : 'Speichern'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Allgemeine Einstellungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {settingsConfig.map((config) => (
            <div key={config.key} className="grid gap-2 sm:grid-cols-3 sm:items-center">
              <Label className="font-medium">{config.label}</Label>
              <div className="sm:col-span-2">
                {config.type === 'boolean' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={config.key}
                      checked={values[config.key] === 'true'}
                      onChange={(e) =>
                        setValues({ ...values, [config.key]: e.target.checked ? 'true' : 'false' })
                      }
                      className="h-4 w-4 rounded"
                    />
                    <Label htmlFor={config.key} className="text-muted-foreground">
                      {values[config.key] === 'true' ? 'Aktiviert' : 'Deaktiviert'}
                    </Label>
                  </div>
                ) : (
                  <Input
                    type={config.type}
                    value={values[config.key] || ''}
                    onChange={(e) => setValues({ ...values, [config.key]: e.target.value })}
                  />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alle Einstellungen</CardTitle>
          <CardDescription>Übersicht aller gespeicherten Einstellungen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {settings.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-mono text-sm">{s.key}</p>
                  {s.description && (
                    <p className="text-muted-foreground text-sm">{s.description}</p>
                  )}
                </div>
                <code className="bg-muted rounded px-2 py-1 text-sm">{s.value}</code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
