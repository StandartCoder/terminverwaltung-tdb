'use client'

import { useCallback, useEffect, useState } from 'react'

const COOKIE_CONSENT_KEY = 'cookie-consent'

type ConsentStatus = 'pending' | 'accepted' | 'declined'

interface CookieConsent {
  status: ConsentStatus
  timestamp: number
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (stored) {
      try {
        setConsent(JSON.parse(stored))
      } catch {
        setConsent(null)
      }
    }
    setIsLoaded(true)
  }, [])

  const accept = useCallback(() => {
    const newConsent: CookieConsent = {
      status: 'accepted',
      timestamp: Date.now(),
    }
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(newConsent))
    setConsent(newConsent)
  }, [])

  const decline = useCallback(() => {
    const newConsent: CookieConsent = {
      status: 'declined',
      timestamp: Date.now(),
    }
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(newConsent))
    setConsent(newConsent)
  }, [])

  const reset = useCallback(() => {
    localStorage.removeItem(COOKIE_CONSENT_KEY)
    setConsent(null)
  }, [])

  return {
    consent,
    isLoaded,
    isPending: isLoaded && !consent,
    isAccepted: consent?.status === 'accepted',
    isDeclined: consent?.status === 'declined',
    accept,
    decline,
    reset,
  }
}
