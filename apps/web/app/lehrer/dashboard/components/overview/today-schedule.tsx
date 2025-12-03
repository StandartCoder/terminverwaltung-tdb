'use client'

import { format, isAfter, isBefore, parseISO } from 'date-fns'
import { Calendar, Phone } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Booking } from '@/lib/api'

interface TodayScheduleProps {
  bookings: Booking[]
  now: Date
}

export function TodaySchedule({ bookings, now }: TodayScheduleProps) {
  const formatTime = (t: string) => format(parseISO(t), 'HH:mm')

  return (
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-amber-500/10 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Heute</CardTitle>
              <CardDescription>{bookings.length} Termine</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {bookings.map((booking) => {
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
  )
}
