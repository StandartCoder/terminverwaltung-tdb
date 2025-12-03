'use client'

import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { Building2, Calendar, ChevronRight, Clock, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Booking } from '@/lib/api'

interface NextAppointmentProps {
  booking: Booking | null
}

export function NextAppointment({ booking }: NextAppointmentProps) {
  const formatTime = (t: string) => format(parseISO(t), 'HH:mm')
  const formatDateFull = (d: string) => format(parseISO(d), 'EEEE, d. MMMM', { locale: de })

  return (
    <Card
      className={`relative overflow-hidden ${booking ? 'border-blue-500 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent' : 'border-dashed'}`}
    >
      <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-blue-500/10" />
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${booking ? 'bg-blue-500 text-white' : 'bg-muted'}`}
          >
            <ChevronRight className="h-4 w-4" />
          </div>
          <CardTitle className="text-lg">Nächster Termin</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {booking ? (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/30">
                <Building2 className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <p className="text-xl font-bold">{booking.companyName}</p>
                <p className="text-muted-foreground">{booking.contactName}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="text-muted-foreground h-4 w-4" />
                <span>{formatDateFull(booking.timeSlot.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="text-muted-foreground h-4 w-4" />
                <span className="font-medium">
                  {formatTime(booking.timeSlot.startTime)} - {formatTime(booking.timeSlot.endTime)}
                </span>
              </div>
            </div>
            {booking.studentName && (
              <div className="flex items-center gap-2 text-sm">
                <User className="text-muted-foreground h-4 w-4" />
                <span>
                  {booking.studentName}
                  {booking.studentClass && ` (${booking.studentClass})`}
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
  )
}
