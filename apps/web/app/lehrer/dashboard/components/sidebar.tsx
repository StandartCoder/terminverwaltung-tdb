'use client'

import {
  Calendar,
  CalendarDays,
  GraduationCap,
  Key,
  LayoutDashboard,
  LogOut,
  MoreVertical,
  Settings,
  Shield,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
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
  {
    id: 'overview' as const,
    label: 'Dashboard',
    icon: LayoutDashboard,
    adminOnly: false,
    description: 'Übersicht & Termine',
  },
  {
    id: 'appointments' as const,
    label: 'Meine Termine',
    icon: Calendar,
    adminOnly: false,
    description: 'Zeitslots verwalten',
  },
  {
    id: 'events' as const,
    label: 'Veranstaltungen',
    icon: CalendarDays,
    adminOnly: true,
    description: 'Events verwalten',
  },
  {
    id: 'departments' as const,
    label: 'Fachbereiche',
    icon: Settings,
    adminOnly: true,
    description: 'Abteilungen',
  },
  {
    id: 'teachers' as const,
    label: 'Lehrkräfte',
    icon: Users,
    adminOnly: true,
    description: 'Benutzer verwalten',
  },
  {
    id: 'settings' as const,
    label: 'Einstellungen',
    icon: Settings,
    adminOnly: true,
    description: 'Systemkonfiguration',
  },
]

export function Sidebar({ teacher, activeTab, onTabChange, onLogout }: SidebarProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredNavItems = navItems.filter((item) => !item.adminOnly || teacher.isAdmin)

  return (
    <aside className="bg-card fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r shadow-sm">
      {/* Logo */}
      <div className="border-b p-4">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <div className="bg-primary text-primary-foreground flex h-11 w-11 items-center justify-center rounded-xl shadow-lg">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold leading-none">OSZ Teltow</h1>
            <p className="text-muted-foreground text-xs">Tag der Betriebe</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <div className="text-muted-foreground mb-2 px-3 text-xs font-semibold uppercase tracking-wider">
          Navigation
        </div>
        {filteredNavItems.slice(0, 2).map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? '' : 'opacity-70 group-hover:opacity-100'}`} />
              <div className="flex-1 text-left">
                <div>{item.label}</div>
                {!isActive && (
                  <div className="text-muted-foreground text-xs font-normal">
                    {item.description}
                  </div>
                )}
              </div>
            </button>
          )
        })}

        {teacher.isAdmin && (
          <>
            <div className="text-muted-foreground mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wider">
              Administration
            </div>
            {filteredNavItems.slice(2).map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${isActive ? '' : 'opacity-70 group-hover:opacity-100'}`}
                  />
                  <div className="flex-1 text-left">
                    <div>{item.label}</div>
                    {!isActive && (
                      <div className="text-muted-foreground text-xs font-normal">
                        {item.description}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </>
        )}
      </nav>

      {/* User Section */}
      <div className="border-t p-3">
        <div className="rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 p-3 dark:from-slate-800 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-md"
              style={{ backgroundColor: teacher.department?.color || '#6366f1' }}
            >
              {teacher.firstName[0]}
              {teacher.lastName[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {teacher.firstName} {teacher.lastName}
              </p>
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                {teacher.isAdmin && (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <Shield className="h-3 w-3" />
                    Admin
                  </span>
                )}
                {teacher.isAdmin && teacher.department?.name && (
                  <span className="text-muted-foreground">·</span>
                )}
                {teacher.department?.name && (
                  <span className="truncate">{teacher.department.name}</span>
                )}
              </div>
            </div>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-1.5 transition-colors"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div className="bg-popover absolute bottom-full right-0 mb-1 w-44 rounded-lg border py-1 shadow-lg">
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      router.push('/lehrer/passwort-aendern')
                    }}
                    className="hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors"
                  >
                    <Key className="h-4 w-4" />
                    Passwort ändern
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      onLogout()
                    }}
                    className="hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 transition-colors dark:text-red-400"
                  >
                    <LogOut className="h-4 w-4" />
                    Abmelden
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
