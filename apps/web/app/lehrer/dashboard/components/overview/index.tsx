'use client'

import { format, isAfter, isBefore, isToday, isTomorrow, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { useMemo } from 'react'
import type { Booking, Teacher } from '@/lib/api'
import type { ScheduleData, Statistics } from '../../types'
import { AdminStatistics } from './admin-statistics'
import { CurrentAppointment } from './current-appointment'
import { ExportSection } from './export-section'
import { NextAppointment } from './next-appointment'
import { NoAppointments } from './no-appointments'
import { TodaySchedule } from './today-schedule'
import { TomorrowSchedule } from './tomorrow-schedule'

interface OverviewTabProps {
  teacher: Teacher
  statistics?: Statistics
  bookings: Booking[]
}

export function OverviewTab({ teacher, statistics, bookings }: OverviewTabProps) {
  const now = useMemo(() => new Date(), [])

  const scheduleData = useMemo((): ScheduleData => {
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

  const greeting = now.getHours() < 12 ? 'Morgen' : now.getHours() < 18 ? 'Tag' : 'Abend'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Guten {greeting}, {teacher.firstName}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(now, 'EEEE, d. MMMM yyyy', { locale: de })}
          </p>
        </div>
      </div>

      {/* Current & Next Appointment */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CurrentAppointment booking={scheduleData.currentAppointment} />
        <NextAppointment booking={scheduleData.nextAppointment} />
      </div>

      {/* Today's Schedule */}
      {scheduleData.todayBookings.length > 0 && (
        <TodaySchedule bookings={scheduleData.todayBookings} now={now} />
      )}

      {/* Tomorrow's Schedule */}
      {scheduleData.tomorrowBookings.length > 0 && (
        <TomorrowSchedule bookings={scheduleData.tomorrowBookings} />
      )}

      {/* No appointments message for non-admins */}
      {!teacher.isAdmin &&
        scheduleData.todayBookings.length === 0 &&
        scheduleData.tomorrowBookings.length === 0 && <NoAppointments />}

      {/* Admin Statistics & Exports */}
      {teacher.isAdmin && statistics && (
        <>
          <AdminStatistics statistics={statistics} />
          <ExportSection />
        </>
      )}
    </div>
  )
}
