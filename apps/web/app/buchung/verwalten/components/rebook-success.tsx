'use client'

import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { Calendar, CheckCircle2, Clock, MapPin, User } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { BookingConfirmation } from '@/lib/api'

interface RebookSuccessProps {
  confirmation: BookingConfirmation
}

export function RebookSuccess({ confirmation }: RebookSuccessProps) {
  const formatTime = (timeStr: string) => format(parseISO(timeStr), 'HH:mm')
  const formatDate = (dateStr: string) =>
    format(parseISO(dateStr), 'EEEE, d. MMMM yyyy', { locale: de })

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
              Buchungscode.
            </p>

            <div className="bg-card mt-8 w-full rounded-lg border p-6 text-left">
              <h3 className="mb-4 font-semibold">Neuer Termin</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="text-muted-foreground h-5 w-5" />
                  <span>{formatDate(confirmation.timeSlot.date)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="text-muted-foreground h-5 w-5" />
                  <span>
                    {formatTime(confirmation.timeSlot.startTime)} -{' '}
                    {formatTime(confirmation.timeSlot.endTime)}
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
                <p className="text-muted-foreground text-sm">Neuer Buchungscode:</p>
                <code className="bg-muted mt-1 block rounded px-3 py-2 font-mono text-sm">
                  {confirmation.cancellationCode}
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
