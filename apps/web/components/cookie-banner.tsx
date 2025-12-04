'use client'

import { Cookie, X } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useCookieConsent } from '@/hooks/use-cookie-consent'

export function CookieBanner() {
  const { isPending, accept, decline } = useCookieConsent()

  if (!isPending) return null

  return (
    <div className="bg-background fixed bottom-0 left-0 right-0 z-50 border-t p-4 shadow-lg md:p-6">
      <div className="container flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <Cookie className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Datenschutz-Hinweis</p>
            <p className="text-muted-foreground text-sm">
              Diese Website verwendet nur technisch notwendige Cookies für die Anmeldung und Ihre
              Datenschutz-Präferenzen. Keine Tracking- oder Werbe-Cookies.{' '}
              <Link href="/datenschutz" className="underline hover:no-underline">
                Mehr erfahren
              </Link>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={decline} className="gap-2">
            <X className="h-4 w-4" />
            Ablehnen
          </Button>
          <Button size="sm" onClick={accept}>
            Akzeptieren
          </Button>
        </div>
      </div>
    </div>
  )
}
