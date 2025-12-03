'use client'

import { Building2, Calendar, CheckCircle2, TrendingUp } from 'lucide-react'
import type { Statistics } from '@/app/lehrer/dashboard/types'
import { Card, CardContent } from '@/components/ui/card'

interface AdminStatisticsProps {
  statistics: Statistics
}

export function AdminStatistics({ statistics }: AdminStatisticsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border-blue-200 bg-gradient-to-br from-blue-500/10 to-blue-500/5 dark:border-blue-900">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/30">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Buchungen</p>
              <p className="text-3xl font-bold">{statistics.bookings.total}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-green-200 bg-gradient-to-br from-green-500/10 to-green-500/5 dark:border-green-900">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500 text-white shadow-lg shadow-green-500/30">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Bestätigt</p>
              <p className="text-3xl font-bold">{statistics.bookings.confirmed}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-purple-200 bg-gradient-to-br from-purple-500/10 to-purple-500/5 dark:border-purple-900">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500 text-white shadow-lg shadow-purple-500/30">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Auslastung</p>
              <p className="text-3xl font-bold">{statistics.timeSlots.utilizationRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-orange-200 bg-gradient-to-br from-orange-500/10 to-orange-500/5 dark:border-orange-900">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/30">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Betriebe</p>
              <p className="text-3xl font-bold">{statistics.companies}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
