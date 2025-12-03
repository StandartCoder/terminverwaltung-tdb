'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronUp,
  Key,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Shield,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useState, useMemo, useRef, useEffect } from 'react'
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

type SortField = 'name' | 'department' | 'status'
type SortDirection = 'asc' | 'desc'

function TeacherRowMenu({
  teacher,
  onEdit,
  onResetPassword,
  onToggleActive,
  onDelete,
  isPending,
}: {
  teacher: Teacher
  onEdit: () => void
  onResetPassword: () => void
  onToggleActive: () => void
  onDelete: () => void
  isPending: boolean
}) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, right: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      })
    }
    setOpen(!open)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-2 transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div
          className="bg-popover fixed z-50 w-52 rounded-lg border py-1 shadow-lg"
          style={{ top: position.top, right: position.right }}
        >
          <button
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
            className="hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Bearbeiten
          </button>
          <button
            onClick={() => {
              setOpen(false)
              onResetPassword()
            }}
            disabled={isPending}
            className="hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors disabled:opacity-50"
          >
            <Key className="h-4 w-4" />
            Passwort zurücksetzen
          </button>
          <button
            onClick={() => {
              setOpen(false)
              onToggleActive()
            }}
            className="hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors"
          >
            {teacher.isActive ? (
              <>
                <UserMinus className="h-4 w-4" />
                Deaktivieren
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4" />
                Aktivieren
              </>
            )}
          </button>
          <div className="my-1 border-t" />
          <button
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
            className="hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 transition-colors dark:text-red-400"
          >
            Löschen
          </button>
        </div>
      )}
    </div>
  )
}

export function TeachersManagement({ teachers, departments }: Props) {
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDepartment, setFilterDepartment] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
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
        title: 'Lehrkraft erstellt',
        description: 'Die Lehrkraft muss beim ersten Login das Passwort ändern.',
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
      toast({ title: 'Gespeichert', description: 'Lehrkraft wurde aktualisiert.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    },
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.teachers.update(id, { isActive }),
    onSuccess: (_, variables) => {
      refresh()
      toast({
        title: variables.isActive ? 'Aktiviert' : 'Deaktiviert',
        description: `Lehrkraft wurde ${variables.isActive ? 'aktiviert' : 'deaktiviert'}.`,
      })
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' })
    },
  })

  const resetPassword = useMutation({
    mutationFn: (id: string) => api.teachers.setPassword(id, 'temp1234'),
    onSuccess: () => {
      toast({
        title: 'Passwort zurückgesetzt',
        description: 'Temporäres Passwort: temp1234',
      })
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const filteredAndSortedTeachers = useMemo(() => {
    let result = [...teachers]

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (t) =>
          t.firstName.toLowerCase().includes(query) ||
          t.lastName.toLowerCase().includes(query) ||
          t.email.toLowerCase().includes(query) ||
          t.room?.toLowerCase().includes(query)
      )
    }

    // Filter by department
    if (filterDepartment) {
      result = result.filter((t) => t.departmentId === filterDepartment)
    }

    // Filter by status
    if (filterStatus === 'active') {
      result = result.filter((t) => t.isActive)
    } else if (filterStatus === 'inactive') {
      result = result.filter((t) => !t.isActive)
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
          break
        case 'department':
          comparison = (a.department?.name || '').localeCompare(b.department?.name || '')
          break
        case 'status':
          comparison = (a.isActive ? 0 : 1) - (b.isActive ? 0 : 1)
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return result
  }, [teachers, searchQuery, filterDepartment, filterStatus, sortField, sortDirection])

  const stats = useMemo(() => {
    const active = teachers.filter((t) => t.isActive).length
    const admins = teachers.filter((t) => t.isAdmin).length
    return { total: teachers.length, active, inactive: teachers.length - active, admins }
  }, [teachers])

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lehrkräfte</h2>
          <p className="text-muted-foreground">
            {stats.total} Lehrkräfte · {stats.active} aktiv · {stats.admins} Admins
          </p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)} size="lg">
            <UserPlus className="mr-2 h-4 w-4" />
            Neue Lehrkraft
          </Button>
        )}
      </div>

      {/* Create Form */}
      {isCreating && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Neue Lehrkraft anlegen</CardTitle>
                <CardDescription>
                  Die Lehrkraft muss beim ersten Login das Passwort ändern.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsCreating(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
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
                  placeholder="Min. 8 Zeichen"
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
              <Label htmlFor="isAdmin" className="flex items-center gap-2 font-normal">
                <Shield className="h-4 w-4 text-amber-500" />
                Administrator-Rechte vergeben
              </Label>
            </div>
            <div className="flex gap-2 pt-2">
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
                <Plus className="mr-2 h-4 w-4" />
                {createMutation.isPending ? 'Erstelle...' : 'Lehrkraft erstellen'}
              </Button>
              <Button variant="ghost" onClick={() => setIsCreating(false)}>
                Abbrechen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters & Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Suchen nach Name, E-Mail, Raum..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              className="border-input bg-background h-10 appearance-none rounded-md border py-2 pl-3 pr-8 text-sm"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.25rem 1.25rem',
              }}
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              <option value="">Alle Fachbereiche</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              className="border-input bg-background h-10 appearance-none rounded-md border py-2 pl-3 pr-8 text-sm"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.25rem 1.25rem',
              }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            >
              <option value="all">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Deaktiviert</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-visible">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('name')}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-semibold uppercase tracking-wider"
                  >
                    Lehrkraft
                    <SortIcon field="name" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('department')}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-semibold uppercase tracking-wider"
                  >
                    Fachbereich
                    <SortIcon field="department" />
                  </button>
                </th>
                <th className="hidden px-4 py-3 text-left md:table-cell">
                  <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    Raum
                  </span>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('status')}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-semibold uppercase tracking-wider"
                  >
                    Status
                    <SortIcon field="status" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    Aktionen
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredAndSortedTeachers.map((t) =>
                editingId === t.id ? (
                  <tr key={t.id} className="bg-muted/50">
                    <td colSpan={5} className="p-4">
                      <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <div className="space-y-2">
                            <Label>Vorname</Label>
                            <Input
                              value={formData.firstName}
                              onChange={(e) =>
                                setFormData({ ...formData, firstName: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Nachname</Label>
                            <Input
                              value={formData.lastName}
                              onChange={(e) =>
                                setFormData({ ...formData, lastName: e.target.value })
                              }
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
                              onChange={(e) =>
                                setFormData({ ...formData, departmentId: e.target.value })
                              }
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
                              onChange={(e) =>
                                setFormData({ ...formData, isAdmin: e.target.checked })
                              }
                              className="h-4 w-4 rounded"
                            />
                            <Label htmlFor={`admin-${t.id}`} className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-amber-500" />
                              Administrator
                            </Label>
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
                            {updateMutation.isPending ? 'Speichere...' : 'Speichern'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            Abbrechen
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={t.id}
                    className={`hover:bg-muted/50 transition-colors ${!t.isActive ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                          style={{ backgroundColor: t.department?.color || '#6366f1' }}
                        >
                          {t.firstName[0]}
                          {t.lastName[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-medium">
                            <span className="truncate">
                              {t.lastName}, {t.firstName}
                            </span>
                            {t.isAdmin && <Shield className="h-4 w-4 shrink-0 text-amber-500" />}
                          </p>
                          <p className="text-muted-foreground truncate text-sm">{t.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: t.department?.color || '#6366f1' }}
                        />
                        <span className="text-sm">{t.department?.name || '-'}</span>
                      </div>
                    </td>
                    <td className="text-muted-foreground hidden px-4 py-3 text-sm md:table-cell">
                      {t.room || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {t.isActive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          Aktiv
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          Deaktiviert
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <TeacherRowMenu
                        teacher={t}
                        onEdit={() => startEdit(t)}
                        onResetPassword={() => resetPassword.mutate(t.id)}
                        onToggleActive={() =>
                          toggleActive.mutate({ id: t.id, isActive: !t.isActive })
                        }
                        onDelete={() => deleteMutation.mutate(t.id)}
                        isPending={resetPassword.isPending}
                      />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {filteredAndSortedTeachers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="text-muted-foreground mb-4 h-12 w-12" />
            {teachers.length === 0 ? (
              <>
                <p className="text-muted-foreground mb-4">Noch keine Lehrkräfte vorhanden</p>
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Erste Lehrkraft erstellen
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">Keine Lehrkräfte gefunden</p>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
