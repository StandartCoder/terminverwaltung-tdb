'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { api, type Teacher } from '@/lib/api'

interface UseDashboardDataOptions {
  teacher: Teacher | null
}

export function useDashboardData({ teacher }: UseDashboardDataOptions) {
  const [selectedDate, setSelectedDate] = useState('')
  const [newSlotDate, setNewSlotDate] = useState('')
  const [newSlotStart, setNewSlotStart] = useState('08:00')
  const [newSlotEnd, setNewSlotEnd] = useState('08:20')

  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: slots, isLoading: loadingSlots } = useQuery({
    queryKey: ['teacher-slots', teacher?.id, selectedDate],
    queryFn: () => api.timeslots.list({ teacherId: teacher?.id, date: selectedDate || undefined }),
    enabled: !!teacher?.id,
  })

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

  const createSlotMutation = useMutation({
    mutationFn: () =>
      api.timeslots.create({
        teacherId: teacher!.id,
        date: newSlotDate,
        startTime: newSlotStart,
        endTime: newSlotEnd,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-slots'] })
      queryClient.invalidateQueries({ queryKey: ['teacher-bookings'] })
      toast({ title: 'Erstellt', description: 'Zeitslot wurde erstellt.' })
      setNewSlotDate('')
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    },
  })

  const toggleSlotStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'AVAILABLE' | 'BLOCKED' }) =>
      api.timeslots.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacher-slots'] }),
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    },
  })

  const deleteSlot = useMutation({
    mutationFn: (id: string) => api.timeslots.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-slots'] })
      toast({ title: 'Gelöscht', description: 'Zeitslot wurde gelöscht.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    },
  })

  const confirmedBookings = bookings?.data?.filter((b) => b.status === 'CONFIRMED') || []

  return {
    // Data
    slots: slots?.data || [],
    loadingSlots,
    confirmedBookings,
    statistics: statistics?.data,
    departments: departments?.data || [],
    allTeachers: allTeachers?.data || [],
    events: events?.data || [],
    settings: settingsData?.data || [],
    settingsMap: settingsData?.map || {},

    // Slot form state
    selectedDate,
    setSelectedDate,
    newSlotDate,
    setNewSlotDate,
    newSlotStart,
    setNewSlotStart,
    newSlotEnd,
    setNewSlotEnd,

    // Mutations
    createSlot: () => createSlotMutation.mutate(),
    isCreatingSlot: createSlotMutation.isPending,
    toggleSlotStatus: (id: string, status: 'AVAILABLE' | 'BLOCKED') =>
      toggleSlotStatus.mutate({ id, status }),
    deleteSlot: (id: string) => deleteSlot.mutate(id),
  }
}
