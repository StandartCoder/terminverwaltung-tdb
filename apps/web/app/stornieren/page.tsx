'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  MapPin,
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
import { api } from '@/lib/api'

function CancelPageContent() {
  const searchParams = useSearchParams()
  const codeFromUrl = searchParams.get('code')
  const [code, setCode] = useState(codeFromUrl || '')
  const [searchCode, setSearchCode] = useState(codeFromUrl || '')
  const { toast } = useToast()

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchCode(code)
  }

  const formatTimeDisplay = (timeStr: string) => {
    const date = parseISO(timeStr)
    return format(date, 'HH:mm')
  }

  const formatDateDisplay = (dateStr: string) => {
    const date = parseISO(dateStr)
    return format(date, 'EEEE, d. MMMM yyyy', { locale: de })
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold tracking-tight">Termin stornieren</h2>
        <p className="text-muted-foreground mt-2">Geben Sie Ihren Stornierungscode ein</p>
      </div>

      <Card>
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
        <Card className="border-destructive/50 mt-6">
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

      {booking?.data && (
        <Card className="mt-6">
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
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                      <div className="flex gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-500" />
                        <div>
                          <p className="font-medium text-amber-800 dark:text-amber-200">
                            Achtung: Stornierung ist unwiderruflich
                          </p>
                          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                            Nach der Stornierung wird der Termin wieder für andere Buchungen
                            freigegeben.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => cancelMutation.mutate()}
                      disabled={cancelMutation.isPending}
                    >
                      {cancelMutation.isPending
                        ? 'Wird storniert...'
                        : 'Termin unwiderruflich stornieren'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
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
