'use client'

import { format, parseISO } from 'date-fns'
import { Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Booking } from '@/lib/api'

interface TomorrowScheduleProps {
  bookings: Booking[]
}

export function TomorrowSchedule({ bookings }: TomorrowScheduleProps) {
  const formatTime = (t: string) => format(parseISO(t), 'HH:mm')

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-xl">
            <Calendar className="text-primary h-5 w-5" />
          </div>
          <div>
            <CardTitle>Morgen</CardTitle>
            <CardDescription>{bookings.length} Termine</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="hover:bg-muted/50 flex items-center gap-4 p-4 transition-colors"
            >
              <div className="flex w-20 flex-col items-center">
                <span className="text-lg font-bold">{formatTime(booking.timeSlot.startTime)}</span>
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
  )
}
