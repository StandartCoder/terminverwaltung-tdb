'use client'

import {
  Calendar,
  CalendarDays,
  GraduationCap,
  Key,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { Teacher } from '@/lib/api'

export type AdminTab =
  | 'overview'
  | 'appointments'
  | 'departments'
  | 'teachers'
  | 'events'
  | 'settings'

interface SidebarProps {
  teacher: Teacher
  activeTab: AdminTab
  onTabChange: (tab: AdminTab) => void
  onLogout: () => void
}

const navItems = [
  { id: 'overview' as const, label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { id: 'appointments' as const, label: 'Meine Termine', icon: Calendar, adminOnly: false },
  { id: 'events' as const, label: 'Veranstaltungen', icon: CalendarDays, adminOnly: true },
  { id: 'departments' as const, label: 'Fachbereiche', icon: Settings, adminOnly: true },
  { id: 'teachers' as const, label: 'Lehrkräfte', icon: Users, adminOnly: true },
  { id: 'settings' as const, label: 'Einstellungen', icon: Settings, adminOnly: true },
]

export function Sidebar({ teacher, activeTab, onTabChange, onLogout }: SidebarProps) {
  const router = useRouter()

  const filteredNavItems = navItems.filter((item) => !item.adminOnly || teacher.isAdmin)

  return (
    <aside className="bg-card fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r">
      <div className="border-b p-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-xl">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-semibold leading-none">OSZ Teltow</h1>
            <p className="text-muted-foreground text-xs">Tag der Betriebe</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {filteredNavItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="border-t p-3">
        <div className="bg-muted/50 mb-3 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: teacher.department?.color || '#3B82F6' }}
            >
              {teacher.firstName[0]}
              {teacher.lastName[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {teacher.firstName} {teacher.lastName}
              </p>
              <p className="text-muted-foreground flex items-center gap-1 text-xs">
                {teacher.isAdmin && <Shield className="h-3 w-3 text-amber-500" />}
                {teacher.department?.name}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => router.push('/lehrer/passwort-aendern')}
          >
            <Key className="mr-1.5 h-3.5 w-3.5" />
            Passwort
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={onLogout}>
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Abmelden
          </Button>
        </div>
      </div>
    </aside>
  )
}
