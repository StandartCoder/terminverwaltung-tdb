'use client'

import { format, parseISO } from 'date-fns'
import { Building2, CalendarClock, Clock, Phone, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Booking } from '@/lib/api'

interface CurrentAppointmentProps {
  booking: Booking | null
}

export function CurrentAppointment({ booking }: CurrentAppointmentProps) {
  const formatTime = (t: string) => format(parseISO(t), 'HH:mm')

  return (
    <Card
      className={`relative overflow-hidden ${booking ? 'border-green-500 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent' : 'border-dashed'}`}
    >
      <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-green-500/10" />
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${booking ? 'bg-green-500 text-white' : 'bg-muted'}`}
          >
            <Clock className="h-4 w-4" />
          </div>
          <CardTitle className="text-lg">Aktueller Termin</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {booking ? (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-500 text-white shadow-lg shadow-green-500/30">
                <Building2 className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <p className="text-xl font-bold">{booking.companyName}</p>
                <p className="text-muted-foreground">{booking.contactName}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="text-muted-foreground h-4 w-4" />
                <span className="font-medium">
                  {formatTime(booking.timeSlot.startTime)} - {formatTime(booking.timeSlot.endTime)}
                </span>
              </div>
              {booking.studentName && (
                <div className="flex items-center gap-2">
                  <User className="text-muted-foreground h-4 w-4" />
                  <span>
                    {booking.studentName}
                    {booking.studentClass && ` (${booking.studentClass})`}
                  </span>
                </div>
              )}
              {booking.companyPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="text-muted-foreground h-4 w-4" />
                  <span>{booking.companyPhone}</span>
                </div>
              )}
            </div>
            {booking.notes && <p className="bg-muted/50 rounded-lg p-3 text-sm">{booking.notes}</p>}
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
  )
}
