'use client'

import { CalendarClock, Download, FileText, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'

export function ExportSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Datenexport
        </CardTitle>
        <CardDescription>
          Exportieren Sie Buchungen und Terminlisten als CSV oder druckbare Übersicht
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="text-muted-foreground h-5 w-5" />
              <h4 className="font-medium">CSV Export</h4>
            </div>
            <p className="text-muted-foreground mb-4 text-sm">
              Tabellendaten für Excel oder andere Anwendungen
            </p>
            <div className="flex flex-col gap-2">
              <a href={api.export.bookingsCsvUrl({ status: 'CONFIRMED' })} download>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Download className="mr-2 h-4 w-4" />
                  Bestätigte Buchungen
                </Button>
              </a>
              <a href={api.export.bookingsCsvUrl()} download>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Download className="mr-2 h-4 w-4" />
                  Alle Buchungen
                </Button>
              </a>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center gap-2">
              <Printer className="text-muted-foreground h-5 w-5" />
              <h4 className="font-medium">Druckbare Listen</h4>
            </div>
            <p className="text-muted-foreground mb-4 text-sm">
              Optimiert zum Ausdrucken oder als PDF speichern
            </p>
            <div className="flex flex-col gap-2">
              <a href={api.export.bookingsPrintUrl()} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Printer className="mr-2 h-4 w-4" />
                  Terminlisten (pro Lehrkraft)
                </Button>
              </a>
              <a
                href={api.export.bookingsOverviewPrintUrl({ status: 'CONFIRMED' })}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Printer className="mr-2 h-4 w-4" />
                  Buchungsübersicht
                </Button>
              </a>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center gap-2">
              <CalendarClock className="text-muted-foreground h-5 w-5" />
              <h4 className="font-medium">Zeitslot-Übersicht</h4>
            </div>
            <p className="text-muted-foreground mb-4 text-sm">Verfügbarkeit aller Lehrkräfte</p>
            <div className="flex flex-col gap-2">
              <a href={api.export.timeslotsPrintUrl()} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Printer className="mr-2 h-4 w-4" />
                  Alle Zeitslots
                </Button>
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
