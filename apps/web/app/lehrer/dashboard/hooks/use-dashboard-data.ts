'use client'

import { useQuery } from '@tanstack/react-query'
import { api, type Teacher } from '@/lib/api'

interface UseDashboardDataOptions {
  teacher: Teacher | null
}

export function useDashboardData({ teacher }: UseDashboardDataOptions) {
  const { data: bookings } = useQuery({
    queryKey: ['teacher-bookings', teacher?.id],
    queryFn: () => api.bookings.list({ teacherId: teacher?.id, status: 'CONFIRMED' }),
    enabled: !!teacher?.id,
  })

  const { data: statistics } = useQuery({
    queryKey: ['statistics'],
    queryFn: () => api.export.statistics(),
    enabled: !!teacher?.isAdmin,
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.departments.list(),
  })

  const { data: allTeachers } = useQuery({
    queryKey: ['all-teachers'],
    queryFn: () => api.teachers.list(),
    enabled: !!teacher?.isAdmin,
  })

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.events.list(),
    enabled: !!teacher?.isAdmin,
  })

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.list(),
    enabled: !!teacher?.isAdmin,
  })

  const confirmedBookings = bookings?.data?.filter((b) => b.status === 'CONFIRMED') || []

  return {
    confirmedBookings,
    statistics: statistics?.data,
    departments: departments?.data || [],
    allTeachers: allTeachers?.data || [],
    events: events?.data || [],
    settings: settingsData?.data || [],
    settingsMap: settingsData?.map || {},
  }
}
