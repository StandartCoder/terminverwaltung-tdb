'use client'

import { Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function NoAppointments() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <Calendar className="text-muted-foreground h-8 w-8" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">Keine anstehenden Termine</h2>
        <p className="text-muted-foreground text-center">
          Sie haben heute und morgen keine gebuchten Termine.
        </p>
      </CardContent>
    </Card>
  )
}
