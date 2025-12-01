'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Edit2, Key, Plus, Shield, Trash2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  api,
  type CreateTeacherData,
  type Department,
  type Teacher,
  type UpdateTeacherData,
} from '@/lib/api'

interface Props {
  teachers: Teacher[]
  departments: Department[]
}

export function TeachersManagement({ teachers, departments }: Props) {
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<CreateTeacherData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    room: '',
    departmentId: '',
    isAdmin: false,
  })
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['all-teachers'] })

  const createMutation = useMutation({
    mutationFn: () => api.teachers.create(formData),
    onSuccess: () => {
      refresh()
      setIsCreating(false)
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        room: '',
        departmentId: '',
        isAdmin: false,
      })
      toast({
        title: 'Erstellt',
        description: 'Lehrkraft muss beim ersten Login das Passwort ändern.',
      })
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTeacherData }) =>
      api.teachers.update(id, data),
    onSuccess: () => {
      refresh()
      setEditingId(null)
      toast({ title: 'Aktualisiert', description: 'Lehrkraft wurde aktualisiert.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    },
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.teachers.update(id, { isActive }),
    onSuccess: () => {
      refresh()
      toast({ title: 'Aktualisiert', description: 'Status wurde geändert.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    },
  })

  const resetPassword = useMutation({
    mutationFn: (id: string) => api.teachers.setPassword(id, 'temp1234'),
    onSuccess: () => {
      toast({ title: 'Passwort zurückgesetzt', description: 'Temporäres Passwort: temp1234' })
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.teachers.delete(id),
    onSuccess: () => {
      refresh()
      toast({ title: 'Gelöscht', description: 'Lehrkraft wurde gelöscht.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    },
  })

  const startEdit = (t: Teacher) => {
    setEditingId(t.id)
    setFormData({
      email: t.email,
      password: '',
      firstName: t.firstName,
      lastName: t.lastName,
      room: t.room || '',
      departmentId: t.departmentId,
      isAdmin: t.isAdmin,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lehrkräfte</h2>
          <p className="text-muted-foreground">Verwalten Sie alle Lehrkräfte und deren Zugänge</p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Neue Lehrkraft
          </Button>
        )}
      </div>

      {isCreating && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Neue Lehrkraft anlegen</CardTitle>
            <CardDescription>
              Die Lehrkraft muss beim ersten Login das Passwort ändern.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Vorname *</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Max"
                />
              </div>
              <div className="space-y-2">
                <Label>Nachname *</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Mustermann"
                />
              </div>
              <div className="space-y-2">
                <Label>E-Mail *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="max.mustermann@osz-teltow.de"
                />
              </div>
              <div className="space-y-2">
                <Label>Temporäres Passwort *</Label>
                <Input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min. 6 Zeichen"
                />
              </div>
              <div className="space-y-2">
                <Label>Raum</Label>
                <Input
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  placeholder="z.B. A101"
                />
              </div>
              <div className="space-y-2">
                <Label>Fachbereich *</Label>
                <select
                  className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                >
                  <option value="">Auswählen...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAdmin"
                checked={formData.isAdmin}
                onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isAdmin" className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-500" />
                Administrator-Rechte
              </Label>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={
                  !formData.email ||
                  !formData.password ||
                  !formData.firstName ||
                  !formData.lastName ||
                  !formData.departmentId ||
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

      <div className="space-y-3">
        {teachers.map((t) => (
          <Card
            key={t.id}
            className={`transition-all ${editingId === t.id ? 'ring-primary ring-2' : 'hover:shadow-md'} ${!t.isActive ? 'opacity-60' : ''}`}
          >
            <CardContent className="p-4">
              {editingId === t.id ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Vorname</Label>
                      <Input
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nachname</Label>
                      <Input
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>E-Mail</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Raum</Label>
                      <Input
                        value={formData.room}
                        onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fachbereich</Label>
                      <select
                        className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                        value={formData.departmentId}
                        onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      >
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id={`admin-${t.id}`}
                        checked={formData.isAdmin}
                        onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                        className="h-4 w-4 rounded"
                      />
                      <Label htmlFor={`admin-${t.id}`}>Administrator</Label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        updateMutation.mutate({
                          id: t.id,
                          data: {
                            email: formData.email,
                            firstName: formData.firstName,
                            lastName: formData.lastName,
                            room: formData.room || null,
                            departmentId: formData.departmentId,
                            isAdmin: formData.isAdmin,
                          },
                        })
                      }
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-medium text-white"
                      style={{ backgroundColor: t.department?.color || '#3B82F6' }}
                    >
                      {t.firstName[0]}
                      {t.lastName[0]}
                    </div>
                    <div>
                      <p className="flex items-center gap-2 font-medium">
                        {t.firstName} {t.lastName}
                        {t.isAdmin && <Shield className="h-4 w-4 text-amber-500" />}
                        {!t.isActive && (
                          <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            Deaktiviert
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground text-sm">{t.email}</p>
                      <p className="text-muted-foreground text-sm">
                        {t.department?.name}
                        {t.room && ` · Raum ${t.room}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resetPassword.mutate(t.id)}
                      disabled={resetPassword.isPending}
                    >
                      <Key className="mr-1.5 h-3.5 w-3.5" />
                      PW Reset
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive.mutate({ id: t.id, isActive: !t.isActive })}
                    >
                      {t.isActive ? 'Deaktivieren' : 'Aktivieren'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startEdit(t)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive h-8 w-8"
                      onClick={() => deleteMutation.mutate(t.id)}
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

      {teachers.length === 0 && !isCreating && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Noch keine Lehrkräfte vorhanden</p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Erste Lehrkraft erstellen
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
