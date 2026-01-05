'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  CalendarOff,
  CheckCircle2,
  ChevronRight,
  Clock,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  User,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { api, type BookingConfirmation, type Department, type TimeSlot } from '@/lib/api'

interface PublicSettings {
  require_phone: string
  require_contact_name: string
  show_student_fields: string
  show_parent_fields: string
  large_company_threshold: string
  school_name: string
  event_title: string
}

function createBookingSchema(settings: PublicSettings) {
  return z.object({
    companyName: z.string().min(1, 'Firmenname erforderlich'),
    companyEmail: z.string().email('Ungültige E-Mail-Adresse'),
    companyPhone:
      settings.require_phone === 'true'
        ? z.string().min(1, 'Telefonnummer erforderlich')
        : z.string().optional(),
    contactName:
      settings.require_contact_name === 'true'
        ? z.string().min(1, 'Ansprechpartner erforderlich')
        : z.string().optional(),
    studentCount: z.number().int().min(1).max(10).default(1),
    students: z
      .array(
        z.object({
          name: z.string().optional(),
          class: z.string().optional(),
        })
      )
      .optional(),
    parentName: z.string().optional(),
    parentEmail: z.string().email().optional().or(z.literal('')),
    notes: z.string().max(500, 'Maximal 500 Zeichen').optional(),
  })
}

type BookingFormData = z.infer<ReturnType<typeof createBookingSchema>>

type BookingStep = 'department' | 'date' | 'slot' | 'form' | 'confirmation'

export default function HomePage() {
  const [step, setStep] = useState<BookingStep>('department')
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch public settings
  const { data: publicSettings } = useQuery({
    queryKey: ['publicSettings'],
    queryFn: () => api.settings.getPublic(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const settings: PublicSettings = useMemo(
    () => ({
      require_phone: publicSettings?.data?.require_phone || 'false',
      require_contact_name: publicSettings?.data?.require_contact_name || 'true',
      show_student_fields: publicSettings?.data?.show_student_fields || 'true',
      show_parent_fields: publicSettings?.data?.show_parent_fields || 'true',
      large_company_threshold: publicSettings?.data?.large_company_threshold || '5',
      school_name: publicSettings?.data?.school_name || 'OSZ Teltow',
      event_title: publicSettings?.data?.event_title || 'Tag der Betriebe',
    }),
    [publicSettings]
  )

  const bookingSchema = useMemo(() => createBookingSchema(settings), [settings])

  const {
    data: activeEvent,
    isLoading: loadingEvent,
    isError: eventError,
  } = useQuery({
    queryKey: ['activeEvent'],
    queryFn: () => api.events.getActive(),
    retry: false,
  })

  const hasActiveEvent = !eventError && !!activeEvent?.data

  const { data: departments, isLoading: loadingDepartments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.departments.list(),
    enabled: hasActiveEvent,
  })

  const { data: availableDates } = useQuery({
    queryKey: ['dates'],
    queryFn: () => api.timeslots.dates(),
    enabled: step === 'date',
  })

  const { data: slots, isLoading: loadingSlots } = useQuery({
    queryKey: ['slots', selectedDepartment?.id, selectedDate],
    queryFn: () =>
      api.timeslots.available({
        departmentId: selectedDepartment?.id,
        date: selectedDate || undefined,
      }),
    enabled: !!selectedDepartment && !!selectedDate,
  })

  const bookingMutation = useMutation({
    mutationFn: (data: BookingFormData) =>
      api.bookings.create({
        timeSlotId: selectedSlot!.id,
        ...data,
      }),
    onSuccess: (response) => {
      setConfirmation(response.data)
      setStep('confirmation')
      queryClient.invalidateQueries({ queryKey: ['slots'] })
    },
    onError: (error: Error) => {
      toast({
        title: 'Buchung fehlgeschlagen',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      companyName: '',
      companyEmail: '',
      companyPhone: '',
      contactName: '',
      studentCount: 1,
      students: [{ name: '', class: '' }],
      parentName: '',
      parentEmail: '',
      notes: '',
    },
  })

  const studentCount = form.watch('studentCount')
  const threshold = parseInt(settings.large_company_threshold, 10)
  const isSondertermin = studentCount >= threshold
  const effectiveStudentCount = Math.min(studentCount || 1, threshold - 1)

  const handleDepartmentSelect = (dept: Department) => {
    setSelectedDepartment(dept)
    setStep('date')
  }

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setStep('slot')
  }

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot)
    setStep('form')
  }

  const handleBack = () => {
    if (step === 'date') {
      setSelectedDepartment(null)
      setStep('department')
    } else if (step === 'slot') {
      setSelectedDate(null)
      setStep('date')
    } else if (step === 'form') {
      setSelectedSlot(null)
      setStep('slot')
    }
  }

  const onSubmit = (data: BookingFormData) => {
    bookingMutation.mutate(data)
  }

  const resetBooking = () => {
    setStep('department')
    setSelectedDepartment(null)
    setSelectedDate(null)
    setSelectedSlot(null)
    setConfirmation(null)
    form.reset()
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

  return (
    <div className="from-background to-muted/30 min-h-screen bg-gradient-to-b">
      <header className="bg-card/80 sticky top-0 z-50 border-b backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-lg">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-none">OSZ Teltow</h1>
              <p className="text-muted-foreground text-sm">Tag der Betriebe</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/buchung/verwalten"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Buchung verwalten
            </Link>
            <Link
              href="/lehrer"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Lehrkraft-Login
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-8 md:py-12">
        <div className="mx-auto max-w-4xl">
          {loadingEvent ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="bg-muted h-16 w-16 animate-pulse rounded-full" />
              <p className="text-muted-foreground mt-4">Lade Veranstaltung...</p>
            </div>
          ) : !hasActiveEvent ? (
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                  <CalendarOff className="h-10 w-10 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="mt-6 text-2xl font-bold">Keine aktive Veranstaltung</h2>
                <p className="text-muted-foreground mt-3 max-w-md text-center">
                  Aktuell ist kein Tag der Betriebe aktiv. Bitte schauen Sie zu einem späteren
                  Zeitpunkt wieder vorbei.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {step !== 'confirmation' && (
                <div className="mb-8 text-center">
                  <h2 className="text-3xl font-bold tracking-tight">Termin buchen</h2>
                  <p className="text-muted-foreground mt-2">
                    Vereinbaren Sie einen Gesprächstermin mit unseren Lehrkräften
                  </p>
                </div>
              )}

              {/* Progress Steps */}
              {step !== 'confirmation' && (
                <div className="mb-8 flex items-center justify-center gap-2">
                  {['department', 'date', 'slot', 'form'].map((s, i) => (
                    <div key={s} className="flex items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                          step === s
                            ? 'bg-primary text-primary-foreground'
                            : ['department', 'date', 'slot', 'form'].indexOf(step) > i
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {i + 1}
                      </div>
                      {i < 3 && (
                        <ChevronRight
                          className={`mx-1 h-4 w-4 ${
                            ['department', 'date', 'slot', 'form'].indexOf(step) > i
                              ? 'text-primary'
                              : 'text-muted-foreground/50'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Step 1: Department Selection */}
              {step === 'department' && (
                <div className="space-y-4">
                  <h3 className="mb-6 text-center text-lg font-medium">
                    Wählen Sie einen Fachbereich
                  </h3>
                  {loadingDepartments ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-muted h-32 animate-pulse rounded-xl" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {departments?.data.map((dept) => (
                        <button
                          key={dept.id}
                          onClick={() => handleDepartmentSelect(dept)}
                          className="bg-card hover:border-primary hover:shadow-primary/5 group relative overflow-hidden rounded-xl border p-6 text-left transition-all hover:shadow-lg"
                        >
                          <div
                            className="absolute inset-0 opacity-5 transition-opacity group-hover:opacity-10"
                            style={{ backgroundColor: dept.color || '#3B82F6' }}
                          />
                          <div
                            className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg font-bold text-white"
                            style={{ backgroundColor: dept.color || '#3B82F6' }}
                          >
                            {dept.shortCode}
                          </div>
                          <h4 className="font-semibold">{dept.name}</h4>
                          <p className="text-muted-foreground mt-1 text-sm">
                            {dept._count?.teachers || 0} Lehrkräfte
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Date Selection */}
              {step === 'date' && (
                <div className="space-y-4">
                  <div className="mb-6 flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleBack}>
                      Zurück
                    </Button>
                    <span className="text-muted-foreground">|</span>
                    <span className="font-medium">{selectedDepartment?.name}</span>
                  </div>

                  <h3 className="mb-6 text-center text-lg font-medium">Wählen Sie ein Datum</h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {availableDates?.data.map((date) => (
                      <button
                        key={date}
                        onClick={() => handleDateSelect(date.split('T')[0])}
                        className="bg-card hover:border-primary group rounded-xl border p-6 text-left transition-all hover:shadow-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-primary/10 text-primary flex h-14 w-14 flex-col items-center justify-center rounded-lg">
                            <Calendar className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold">{formatDateDisplay(date)}</p>
                            <p className="text-muted-foreground text-sm">Verfügbare Termine</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {availableDates?.data.length === 0 && (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <AlertCircle className="text-muted-foreground/50 h-12 w-12" />
                        <p className="text-muted-foreground mt-4">Keine verfügbaren Termine</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Step 3: Time Slot Selection */}
              {step === 'slot' && (
                <div className="space-y-4">
                  <div className="mb-6 flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleBack}>
                      Zurück
                    </Button>
                    <span className="text-muted-foreground">|</span>
                    <span className="font-medium">{selectedDepartment?.name}</span>
                    <span className="text-muted-foreground">|</span>
                    <span className="font-medium">
                      {selectedDate && formatDateDisplay(selectedDate)}
                    </span>
                  </div>

                  <h3 className="mb-6 text-center text-lg font-medium">Wählen Sie einen Termin</h3>

                  {loadingSlots ? (
                    <div className="space-y-4">
                      {[1, 2].map((i) => (
                        <div key={i} className="bg-muted h-48 animate-pulse rounded-xl" />
                      ))}
                    </div>
                  ) : slots?.data && slots.data.length > 0 ? (
                    <div className="space-y-6">
                      {Object.entries(groupSlotsByTeacher(slots.data)).map(
                        ([teacherId, teacherSlots]) => {
                          const teacher = teacherSlots[0]?.teacher
                          if (!teacher) return null

                          return (
                            <Card key={teacherId}>
                              <CardHeader className="pb-3">
                                <div className="flex items-center gap-4">
                                  <div
                                    className="flex h-12 w-12 items-center justify-center rounded-full font-medium text-white"
                                    style={{
                                      backgroundColor: teacher.department?.color || '#3B82F6',
                                    }}
                                  >
                                    {teacher.firstName[0]}
                                    {teacher.lastName[0]}
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg">
                                      {teacher.firstName} {teacher.lastName}
                                    </CardTitle>
                                    <CardDescription className="flex items-center gap-2">
                                      {teacher.room && (
                                        <>
                                          <MapPin className="h-3 w-3" />
                                          Raum {teacher.room}
                                        </>
                                      )}
                                    </CardDescription>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="flex flex-wrap gap-2">
                                  {teacherSlots.map((slot) => (
                                    <button
                                      key={slot.id}
                                      onClick={() => handleSlotSelect(slot)}
                                      className="bg-background hover:border-primary hover:bg-primary hover:text-primary-foreground inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all"
                                    >
                                      <Clock className="h-4 w-4" />
                                      {formatTimeDisplay(slot.startTime)} -{' '}
                                      {formatTimeDisplay(slot.endTime)}
                                    </button>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )
                        }
                      )}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <AlertCircle className="text-muted-foreground/50 h-12 w-12" />
                        <p className="text-muted-foreground mt-4">
                          Keine verfügbaren Termine für dieses Datum
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Step 4: Booking Form */}
              {step === 'form' && selectedSlot && (
                <div className="space-y-6">
                  <div className="mb-6 flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleBack}>
                      Zurück
                    </Button>
                  </div>

                  <Card className="border-primary/20">
                    <CardHeader className="bg-primary/5 border-b">
                      <CardTitle className="text-lg">Ausgewählter Termin</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex items-center gap-3">
                          <Calendar className="text-muted-foreground h-5 w-5" />
                          <div>
                            <p className="text-muted-foreground text-sm">Datum</p>
                            <p className="font-medium">
                              {selectedDate && formatDateDisplay(selectedDate)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="text-muted-foreground h-5 w-5" />
                          <div>
                            <p className="text-muted-foreground text-sm">Uhrzeit</p>
                            <p className="font-medium">
                              {formatTimeDisplay(selectedSlot.startTime)} -{' '}
                              {formatTimeDisplay(selectedSlot.endTime)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <User className="text-muted-foreground h-5 w-5" />
                          <div>
                            <p className="text-muted-foreground text-sm">Lehrkraft</p>
                            <p className="font-medium">
                              {selectedSlot.teacher?.firstName} {selectedSlot.teacher?.lastName}
                            </p>
                          </div>
                        </div>
                        {selectedSlot.teacher?.room && (
                          <div className="flex items-center gap-3">
                            <MapPin className="text-muted-foreground h-5 w-5" />
                            <div>
                              <p className="text-muted-foreground text-sm">Raum</p>
                              <p className="font-medium">{selectedSlot.teacher.room}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Ihre Kontaktdaten</CardTitle>
                      <CardDescription>
                        Bitte geben Sie Ihre Firmendaten ein. Sie erhalten eine Bestätigung per
                        E-Mail.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Company Info */}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="companyName">
                              <Building2 className="mr-2 inline h-4 w-4" />
                              Firmenname *
                            </Label>
                            <Input
                              id="companyName"
                              placeholder="Muster GmbH"
                              {...form.register('companyName')}
                            />
                            {form.formState.errors.companyName && (
                              <p className="text-destructive text-sm">
                                {form.formState.errors.companyName.message}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="contactName">
                              <User className="mr-2 inline h-4 w-4" />
                              Ansprechpartner{' '}
                              {settings.require_contact_name === 'true' ? '*' : '(optional)'}
                            </Label>
                            <Input
                              id="contactName"
                              placeholder="Max Mustermann"
                              {...form.register('contactName')}
                            />
                            {form.formState.errors.contactName && (
                              <p className="text-destructive text-sm">
                                {form.formState.errors.contactName.message}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="companyEmail">
                              <Mail className="mr-2 inline h-4 w-4" />
                              E-Mail-Adresse *
                            </Label>
                            <Input
                              id="companyEmail"
                              type="email"
                              placeholder="kontakt@firma.de"
                              {...form.register('companyEmail')}
                            />
                            {form.formState.errors.companyEmail && (
                              <p className="text-destructive text-sm">
                                {form.formState.errors.companyEmail.message}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="companyPhone">
                              <Phone className="mr-2 inline h-4 w-4" />
                              Telefon {settings.require_phone === 'true' ? '*' : '(optional)'}
                            </Label>
                            <Input
                              id="companyPhone"
                              type="tel"
                              placeholder="+49 30 12345678"
                              {...form.register('companyPhone')}
                            />
                            {form.formState.errors.companyPhone && (
                              <p className="text-destructive text-sm">
                                {form.formState.errors.companyPhone.message}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="studentCount">
                              <Users className="mr-2 inline h-4 w-4" />
                              Anzahl Auszubildende
                            </Label>
                            <Input
                              id="studentCount"
                              type="number"
                              min={1}
                              defaultValue={1}
                              {...form.register('studentCount', { valueAsNumber: true })}
                            />
                          </div>
                        </div>

                        {/* Sondertermin Warning */}
                        {isSondertermin && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                            <div className="flex gap-3">
                              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                              <div>
                                <h4 className="font-medium text-amber-800 dark:text-amber-200">
                                  Sondertermin erforderlich
                                </h4>
                                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                                  Für Betriebe mit {threshold} oder mehr Auszubildenden bieten wir
                                  Sondertermine an. Bitte kontaktieren Sie das Sekretariat oder die
                                  Lehrkraft direkt, um einen individuellen Termin zu vereinbaren.
                                </p>
                                {selectedSlot?.teacher && (
                                  <p className="mt-2 text-sm font-medium text-amber-700 dark:text-amber-300">
                                    Lehrkraft: {selectedSlot.teacher.firstName}{' '}
                                    {selectedSlot.teacher.lastName}
                                    {selectedSlot.teacher.department && (
                                      <span className="font-normal">
                                        {' '}
                                        ({selectedSlot.teacher.department.name})
                                      </span>
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Student Fields - dynamic based on studentCount */}
                        {settings.show_student_fields === 'true' &&
                          !isSondertermin &&
                          effectiveStudentCount > 0 && (
                            <div className="border-t pt-4">
                              <h4 className="mb-4 font-medium">
                                Auszubildende ({effectiveStudentCount}) - optional
                              </h4>
                              <div className="space-y-4">
                                {Array.from({ length: effectiveStudentCount }).map((_, index) => (
                                  <div key={index} className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                      <Label htmlFor={`student-name-${index}`}>
                                        Name {effectiveStudentCount > 1 ? `#${index + 1}` : ''}
                                      </Label>
                                      <Input
                                        id={`student-name-${index}`}
                                        placeholder="Max Mustermann"
                                        {...form.register(`students.${index}.name`)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor={`student-class-${index}`}>
                                        Klasse {effectiveStudentCount > 1 ? `#${index + 1}` : ''}
                                      </Label>
                                      <Input
                                        id={`student-class-${index}`}
                                        placeholder="z.B. FAI21"
                                        {...form.register(`students.${index}.class`)}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* Parent Fields */}
                        {settings.show_parent_fields === 'true' && (
                          <div className="border-t pt-4">
                            <h4 className="mb-4 font-medium">Elternkontakt (optional)</h4>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label htmlFor="parentName">Name Elternteil</Label>
                                <Input
                                  id="parentName"
                                  placeholder="Erika Mustermann"
                                  {...form.register('parentName')}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="parentEmail">E-Mail Elternteil</Label>
                                <Input
                                  id="parentEmail"
                                  type="email"
                                  placeholder="eltern@beispiel.de"
                                  {...form.register('parentEmail')}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2 border-t pt-4">
                          <Label htmlFor="notes">Notizen (optional)</Label>
                          <textarea
                            id="notes"
                            className="bg-background focus:ring-ring min-h-[80px] w-full resize-none rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                            placeholder="Besondere Anliegen oder Gesprächsthemen"
                            {...form.register('notes')}
                          />
                        </div>

                        <Button
                          type="submit"
                          className="w-full"
                          size="lg"
                          disabled={bookingMutation.isPending || isSondertermin}
                        >
                          {bookingMutation.isPending
                            ? 'Wird gebucht...'
                            : isSondertermin
                              ? 'Sondertermin erforderlich'
                              : 'Termin verbindlich buchen'}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Step 5: Confirmation */}
              {step === 'confirmation' && confirmation && (
                <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
                  <CardContent className="pb-8 pt-8">
                    <div className="flex flex-col items-center text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                      <h2 className="mt-4 text-2xl font-bold">Buchung erfolgreich!</h2>
                      <p className="text-muted-foreground mt-2 max-w-md">
                        Sie erhalten in Kürze eine Bestätigung per E-Mail mit allen Details und
                        einem Link zur Stornierung.
                      </p>

                      <div className="bg-card mt-8 w-full max-w-md rounded-lg border p-6 text-left">
                        <h3 className="mb-4 font-semibold">Termindetails</h3>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Calendar className="text-muted-foreground h-5 w-5" />
                            <span>{formatDateDisplay(confirmation.timeSlot.date)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Clock className="text-muted-foreground h-5 w-5" />
                            <span>
                              {formatTimeDisplay(confirmation.timeSlot.startTime)} -{' '}
                              {formatTimeDisplay(confirmation.timeSlot.endTime)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <User className="text-muted-foreground h-5 w-5" />
                            <span>
                              {confirmation.teacher.firstName} {confirmation.teacher.lastName}
                            </span>
                          </div>
                          {confirmation.teacher.room && (
                            <div className="flex items-center gap-3">
                              <MapPin className="text-muted-foreground h-5 w-5" />
                              <span>Raum {confirmation.teacher.room}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-6 border-t pt-4">
                          <p className="text-muted-foreground text-sm">Buchungscode:</p>
                          <code className="bg-muted mt-1 block rounded px-3 py-2 font-mono text-sm">
                            {confirmation.cancellationCode}
                          </code>
                          <p className="text-muted-foreground mt-2 text-xs">
                            Bewahren Sie diesen Code auf, um Ihren Termin zu verwalten.
                          </p>
                        </div>
                      </div>

                      <Button onClick={resetBooking} className="mt-8" variant="outline">
                        Weiteren Termin buchen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>

      <footer className="bg-muted/30 mt-12 border-t py-8">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <h3 className="font-semibold">OSZ Teltow</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Oberstufenzentrum Teltow
                <br />
                Potsdamer Straße 4
                <br />
                14513 Teltow
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Kontakt</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Telefon: (03328) 35 07 0
                <br />
                E-Mail: info@osz-teltow.de
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Rechtliches</h3>
              <div className="mt-2 flex flex-col gap-1">
                <Link
                  href="/impressum"
                  className="text-muted-foreground hover:text-foreground text-sm hover:underline"
                >
                  Impressum
                </Link>
                <Link
                  href="/datenschutz"
                  className="text-muted-foreground hover:text-foreground text-sm hover:underline"
                >
                  Datenschutzerklärung
                </Link>
              </div>
            </div>
          </div>
          <div className="text-muted-foreground mt-8 border-t pt-6 text-center text-sm">
            <p>Tag der Betriebe {new Date().getFullYear()} · OSZ Teltow</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
