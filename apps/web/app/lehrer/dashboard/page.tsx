'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/auth'
import { AppointmentsTab } from './components/appointments'
import { DepartmentsManagement } from './components/departments-management'
import { EventsManagement } from './components/events-management'
import { OverviewTab } from './components/overview'
import { SettingsTab } from './components/settings-tab'
import { Sidebar, type AdminTab } from './components/sidebar'
import { TeachersManagement } from './components/teachers-management'
import { useDashboardData } from './hooks/use-dashboard-data'

export default function DashboardPage() {
  const { teacher, isLoading, logout } = useRequireAuth()
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const router = useRouter()

  const { confirmedBookings, statistics, departments, allTeachers, events, settingsMap } =
    useDashboardData({ teacher })

  // Redirect to password change page if required
  useEffect(() => {
    if (!isLoading && teacher?.mustChangePassword) {
      router.replace('/lehrer/passwort-aendern')
    }
  }, [isLoading, teacher, router])

  if (isLoading || !teacher || teacher.mustChangePassword) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground">Wird geladen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-muted/30 min-h-screen">
      <Sidebar
        teacher={teacher}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={logout}
      />

      <main className="pl-64">
        <div className="p-8">
          {activeTab === 'overview' && (
            <OverviewTab teacher={teacher} statistics={statistics} bookings={confirmedBookings} />
          )}

          {activeTab === 'appointments' && <AppointmentsTab teacherId={teacher.id} />}

          {activeTab === 'events' && teacher.isAdmin && <EventsManagement events={events} />}

          {activeTab === 'departments' && teacher.isAdmin && (
            <DepartmentsManagement departments={departments} />
          )}

          {activeTab === 'teachers' && teacher.isAdmin && (
            <TeachersManagement teachers={allTeachers} departments={departments} />
          )}

          {activeTab === 'settings' && teacher.isAdmin && <SettingsTab settingsMap={settingsMap} />}
        </div>
      </main>
    </div>
  )
}
