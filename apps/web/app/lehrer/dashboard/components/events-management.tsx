'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { CalendarDays, Check, Edit2, Plus, Power, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { api, type CreateEventData, type Event } from '@/lib/api'

interface Props {
  events: Event[]
}

export function EventsManagement({ events }: Props) {
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<CreateEventData>({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    bookingOpenAt: '',
    bookingCloseAt: '',
    defaultSlotLength: 20,
    isActive: false,
  })
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['events'] })

  const toISOOrUndefined = (val: string | undefined): string | undefined =>
    val ? new Date(val).toISOString() : undefined

  const createMutation = useMutation({
    mutationFn: () =>
      api.events.create({
        name: formData.name,
        description: formData.description || undefined,
        startDate: formData.startDate,
        endDate: formData.endDate,
        bookingOpenAt: toISOOrUndefined(formData.bookingOpenAt),
        bookingCloseAt: toISOOrUndefined(formData.bookingCloseAt),
        defaultSlotLength: formData.defaultSlotLength,
        isActive: formData.isActive,
      }),
    onSuccess: () => {
      refresh()
      setIsCreating(false)
      setFormData({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        bookingOpenAt: '',
        bookingCloseAt: '',
        defaultSlotLength: 20,
        isActive: false,
      })
      toast({ title: 'Erstellt', description: 'Veranstaltung wurde erstellt.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateEventData> }) =>
      api.events.update(id, {
        ...data,
        bookingOpenAt: toISOOrUndefined(data.bookingOpenAt),
        bookingCloseAt: toISOOrUndefined(data.bookingCloseAt),
      }),
    onSuccess: () => {
      refresh()
      setEditingId(null)
      toast({ title: 'Aktualisiert', description: 'Veranstaltung wurde aktualisiert.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    },
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.events.update(id, { isActive }),
    onSuccess: () => {
      refresh()
      toast({ title: 'Aktualisiert', description: 'Status wurde geändert.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.events.delete(id),
    onSuccess: () => {
      refresh()
      toast({ title: 'Gelöscht', description: 'Veranstaltung wurde gelöscht.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    },
  })

  const startEdit = (e: Event) => {
    setEditingId(e.id)
    setFormData({
      name: e.name,
      description: e.description || '',
      startDate: e.startDate.split('T')[0],
      endDate: e.endDate.split('T')[0],
      bookingOpenAt: e.bookingOpenAt ? e.bookingOpenAt.slice(0, 16) : '',
      bookingCloseAt: e.bookingCloseAt ? e.bookingCloseAt.slice(0, 16) : '',
      defaultSlotLength: e.defaultSlotLength,
      isActive: e.isActive,
    })
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'd. MMMM yyyy', { locale: de })
    } catch {
      return dateStr
    }
  }

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      return format(parseISO(dateStr), 'd. MMM yyyy, HH:mm', { locale: de })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Veranstaltungen</h2>
          <p className="text-muted-foreground">Verwalten Sie Termine für den Tag der Betriebe</p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Neue Veranstaltung
          </Button>
        )}
      </div>

      {isCreating && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Neue Veranstaltung</CardTitle>
            <CardDescription>Erstellen Sie einen neuen Tag der Betriebe</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Tag der Betriebe 2025"
                />
              </div>
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optionale Beschreibung"
                />
              </div>
              <div className="space-y-2">
                <Label>Startdatum *</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Enddatum *</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Buchung öffnet</Label>
                <Input
                  type="datetime-local"
                  value={formData.bookingOpenAt}
                  onChange={(e) => setFormData({ ...formData, bookingOpenAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Buchung schließt</Label>
                <Input
                  type="datetime-local"
                  value={formData.bookingCloseAt}
                  onChange={(e) => setFormData({ ...formData, bookingCloseAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Terminlänge (Minuten)</Label>
                <Input
                  type="number"
                  min={5}
                  max={120}
                  value={formData.defaultSlotLength}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultSlotLength: parseInt(e.target.value) || 20 })
                  }
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded"
                />
                <Label htmlFor="isActive">Sofort aktivieren</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={
                  !formData.name ||
                  !formData.startDate ||
                  !formData.endDate ||
                  createMutation.isPending
                }
              >
                {createMutation.isPending ? 'Erstelle...' : 'Erstellen'}
              </Button>
              <Button variant="ghost" onClick={() => setIsCreating(false)}>
                Abbrechen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {events.map((event) => (
          <Card
            key={event.id}
            className={`transition-all ${event.isActive ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : ''} ${editingId === event.id ? 'ring-primary ring-2' : 'hover:shadow-md'}`}
          >
            <CardContent className="p-5">
              {editingId === event.id ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Beschreibung</Label>
                      <Input
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Startdatum</Label>
                      <Input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Enddatum</Label>
                      <Input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Buchung öffnet</Label>
                      <Input
                        type="datetime-local"
                        value={formData.bookingOpenAt}
                        onChange={(e) =>
                          setFormData({ ...formData, bookingOpenAt: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Buchung schließt</Label>
                      <Input
                        type="datetime-local"
                        value={formData.bookingCloseAt}
                        onChange={(e) =>
                          setFormData({ ...formData, bookingCloseAt: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Terminlänge (Min.)</Label>
                      <Input
                        type="number"
                        min={5}
                        max={120}
                        value={formData.defaultSlotLength}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            defaultSlotLength: parseInt(e.target.value) || 20,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateMutation.mutate({ id: event.id, data: formData })}
                      disabled={updateMutation.isPending}
                    >
                      Speichern
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-xl ${event.isActive ? 'bg-green-500 text-white' : 'bg-muted'}`}
                    >
                      <CalendarDays className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{event.name}</h3>
                        {event.isActive && (
                          <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <Check className="h-3 w-3" />
                            Aktiv
                          </span>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-muted-foreground text-sm">{event.description}</p>
                      )}
                      <div className="text-muted-foreground mt-2 grid gap-1 text-sm">
                        <p>
                          <span className="font-medium">Zeitraum:</span>{' '}
                          {formatDate(event.startDate)} – {formatDate(event.endDate)}
                        </p>
                        <p>
                          <span className="font-medium">Buchungszeitraum:</span>{' '}
                          {formatDateTime(event.bookingOpenAt)} –{' '}
                          {formatDateTime(event.bookingCloseAt)}
                        </p>
                        <p>
                          <span className="font-medium">Terminlänge:</span>{' '}
                          {event.defaultSlotLength} Minuten
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={event.isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        toggleActive.mutate({ id: event.id, isActive: !event.isActive })
                      }
                    >
                      <Power className="mr-1.5 h-3.5 w-3.5" />
                      {event.isActive ? 'Deaktivieren' : 'Aktivieren'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startEdit(event)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive h-8 w-8"
                      onClick={() => deleteMutation.mutate(event.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {events.length === 0 && !isCreating && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarDays className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-muted-foreground mb-4">Noch keine Veranstaltungen vorhanden</p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Erste Veranstaltung erstellen
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
