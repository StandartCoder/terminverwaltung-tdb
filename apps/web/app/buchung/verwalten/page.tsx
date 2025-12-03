'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { api, type BookingConfirmation, type TimeSlot } from '@/lib/api'
import { BookingCodeForm } from './components/booking-code-form'
import { BookingDetailsView } from './components/booking-details'
import { BookingNotFound } from './components/booking-not-found'
import { RebookFlow } from './components/rebook-flow'
import { RebookSuccess } from './components/rebook-success'
import type { ViewMode } from './types'

function ManageBookingContent() {
  const searchParams = useSearchParams()
  const codeFromUrl = searchParams.get('code')
  const [code, setCode] = useState(codeFromUrl || '')
  const [searchCode, setSearchCode] = useState(codeFromUrl || '')
  const [viewMode, setViewMode] = useState<ViewMode>('search')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [rebookConfirmation, setRebookConfirmation] = useState<BookingConfirmation | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (codeFromUrl) {
      setCode(codeFromUrl)
      setSearchCode(codeFromUrl)
      setViewMode('details')
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

  const handleConfirmRebook = () => {
    if (selectedSlot) {
      rebookMutation.mutate(selectedSlot.id)
    }
  }

  // Show rebook success
  if (rebookConfirmation) {
    return <RebookSuccess confirmation={rebookConfirmation} />
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold tracking-tight">Termin verwalten</h2>
        <p className="text-muted-foreground mt-2">Stornieren oder umbuchen Sie Ihren Termin</p>
      </div>

      <BookingCodeForm
        code={code}
        onCodeChange={setCode}
        onSearch={handleSearch}
        isLoading={isLoading}
      />

      {error && <BookingNotFound />}

      {booking?.data && viewMode === 'details' && (
        <BookingDetailsView
          booking={booking.data}
          onStartRebook={handleStartRebook}
          onCancel={() => cancelMutation.mutate()}
          isCancelling={cancelMutation.isPending}
          isRebooking={rebookMutation.isPending}
        />
      )}

      {booking?.data && viewMode === 'rebook' && booking.data.status !== 'CANCELLED' && (
        <RebookFlow
          booking={booking.data}
          availableDates={availableDates?.data || []}
          availableSlots={availableSlots?.data || []}
          loadingSlots={loadingSlots}
          selectedDate={selectedDate}
          selectedSlot={selectedSlot}
          onDateSelect={handleDateSelect}
          onSlotSelect={setSelectedSlot}
          onClearDate={() => setSelectedDate(null)}
          onClearSlot={() => setSelectedSlot(null)}
          onConfirmRebook={handleConfirmRebook}
          onBack={handleBackToDetails}
          isRebooking={rebookMutation.isPending}
        />
      )}

      <div className="mt-8 text-center">
        <Link href="/">
          <Button variant="outline">Zurück zur Startseite</Button>
        </Link>
      </div>
    </div>
  )
}

export default function ManageBookingPage() {
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
          <ManageBookingContent />
        </Suspense>
      </main>
    </div>
  )
}
