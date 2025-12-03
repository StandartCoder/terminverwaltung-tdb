'use client'

import { XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function BookingNotFound() {
  return (
    <Card className="border-destructive/50">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center">
          <XCircle className="text-destructive h-12 w-12" />
          <h3 className="mt-4 font-semibold">Buchung nicht gefunden</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            Bitte überprüfen Sie Ihren Buchungscode und versuchen Sie es erneut.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
