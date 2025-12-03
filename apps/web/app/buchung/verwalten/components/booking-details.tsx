'use client'

import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  User,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { BookingDetails } from '@/lib/api'

interface BookingDetailsViewProps {
  booking: BookingDetails
  onStartRebook: () => void
  onCancel: () => void
  isCancelling: boolean
  isRebooking: boolean
}

export function BookingDetailsView({
  booking,
  onStartRebook,
  onCancel,
  isCancelling,
  isRebooking,
}: BookingDetailsViewProps) {
  const formatTime = (timeStr: string) => format(parseISO(timeStr), 'HH:mm')
  const formatDate = (dateStr: string) =>
    format(parseISO(dateStr), 'EEEE, d. MMMM yyyy', { locale: de })

  const isCancelled = booking.status === 'CANCELLED'

  return (
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
              <p className="font-medium">{formatDate(booking.timeSlot.date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="text-muted-foreground h-5 w-5" />
            <div>
              <p className="text-muted-foreground text-sm">Uhrzeit</p>
              <p className="font-medium">
                {formatTime(booking.timeSlot.startTime)} - {formatTime(booking.timeSlot.endTime)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <User className="text-muted-foreground h-5 w-5" />
            <div>
              <p className="text-muted-foreground text-sm">Lehrkraft</p>
              <p className="font-medium">
                {booking.teacher.firstName} {booking.teacher.lastName}
              </p>
            </div>
          </div>
          {booking.teacher.room && (
            <div className="flex items-center gap-3">
              <MapPin className="text-muted-foreground h-5 w-5" />
              <div>
                <p className="text-muted-foreground text-sm">Raum</p>
                <p className="font-medium">{booking.teacher.room}</p>
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            {isCancelled ? (
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
                    onClick={onStartRebook}
                    disabled={isRebooking}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Termin umbuchen
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={onCancel}
                    disabled={isCancelling}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    {isCancelling ? 'Wird storniert...' : 'Termin stornieren'}
                  </Button>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-500" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">Hinweis</p>
                      <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                        Bei einer Stornierung wird der Termin unwiderruflich gelöscht. Wenn Sie nur
                        einen anderen Zeitpunkt wünschen, nutzen Sie bitte die Umbuchungsfunktion.
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
  )
}
