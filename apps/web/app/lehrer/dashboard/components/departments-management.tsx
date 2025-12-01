'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Edit2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  api,
  type CreateDepartmentData,
  type Department,
  type UpdateDepartmentData,
} from '@/lib/api'

interface Props {
  departments: Department[]
}

export function DepartmentsManagement({ departments }: Props) {
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<CreateDepartmentData>({
    name: '',
    shortCode: '',
    color: '#3B82F6',
  })
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['departments'] })

  const createMutation = useMutation({
    mutationFn: () => api.departments.create(formData),
    onSuccess: () => {
      refresh()
      setIsCreating(false)
      setFormData({ name: '', shortCode: '', color: '#3B82F6' })
      toast({ title: 'Erstellt', description: 'Fachbereich wurde erstellt.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDepartmentData }) =>
      api.departments.update(id, data),
    onSuccess: () => {
      refresh()
      setEditingId(null)
      toast({ title: 'Aktualisiert', description: 'Fachbereich wurde aktualisiert.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.departments.delete(id),
    onSuccess: () => {
      refresh()
      toast({ title: 'Gelöscht', description: 'Fachbereich wurde gelöscht.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    },
  })

  const startEdit = (dept: Department) => {
    setEditingId(dept.id)
    setFormData({ name: dept.name, shortCode: dept.shortCode, color: dept.color || '#3B82F6' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fachbereiche</h2>
          <p className="text-muted-foreground">Verwalten Sie die Fachbereiche der Schule</p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Neuer Fachbereich
          </Button>
        )}
      </div>

      {isCreating && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Neuer Fachbereich</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Informatik"
                />
              </div>
              <div className="space-y-2">
                <Label>Kürzel</Label>
                <Input
                  value={formData.shortCode}
                  onChange={(e) =>
                    setFormData({ ...formData, shortCode: e.target.value.toUpperCase() })
                  }
                  placeholder="IT"
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label>Farbe</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-10 w-14 cursor-pointer p-1"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!formData.name || !formData.shortCode || createMutation.isPending}
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => (
          <Card
            key={dept.id}
            className={`transition-all ${editingId === dept.id ? 'ring-primary ring-2' : 'hover:shadow-md'}`}
          >
            <CardContent className="p-5">
              {editingId === dept.id ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kürzel</Label>
                    <Input
                      value={formData.shortCode}
                      onChange={(e) =>
                        setFormData({ ...formData, shortCode: e.target.value.toUpperCase() })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Farbe</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="h-10 w-14 cursor-pointer p-1"
                      />
                      <Input
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateMutation.mutate({ id: dept.id, data: formData })}
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
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-xl text-lg font-bold text-white shadow-sm"
                      style={{ backgroundColor: dept.color || '#3B82F6' }}
                    >
                      {dept.shortCode}
                    </div>
                    <div>
                      <p className="font-semibold">{dept.name}</p>
                      <p className="text-muted-foreground text-sm">
                        {dept._count?.teachers || 0} Lehrkräfte
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startEdit(dept)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive h-8 w-8"
                      onClick={() => deleteMutation.mutate(dept.id)}
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

      {departments.length === 0 && !isCreating && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Noch keine Fachbereiche vorhanden</p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ersten Fachbereich erstellen
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
