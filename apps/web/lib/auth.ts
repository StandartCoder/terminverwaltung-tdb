'use client'

import { AUTH_STORAGE_KEY } from '@terminverwaltung/shared'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api, type Teacher } from './api'

const SESSION_TIMESTAMP_KEY = 'terminverwaltung_session_timestamp'
const DEFAULT_SESSION_TIMEOUT_MINUTES = 60

export interface AuthState {
  teacher: Teacher | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface StoredSession {
  teacher: Teacher
  timestamp: number
}

function getStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    const timestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY)
    if (!stored) return null
    return {
      teacher: JSON.parse(stored) as Teacher,
      timestamp: timestamp ? parseInt(timestamp, 10) : Date.now(),
    }
  } catch {
    return null
  }
}

function setStoredSession(teacher: Teacher | null): void {
  if (typeof window === 'undefined') return
  if (teacher) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(teacher))
    localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString())
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    localStorage.removeItem(SESSION_TIMESTAMP_KEY)
  }
}

function updateSessionTimestamp(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString())
}

function isSessionExpired(timestamp: number, timeoutMinutes: number): boolean {
  const now = Date.now()
  const expirationTime = timestamp + timeoutMinutes * 60 * 1000
  return now > expirationTime
}

export function useAuth() {
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionTimeout, setSessionTimeout] = useState(DEFAULT_SESSION_TIMEOUT_MINUTES)
  const router = useRouter()
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch session timeout setting
  useEffect(() => {
    api.settings
      .getPublic()
      .then((response) => {
        const timeout = parseInt(response.data.session_timeout_minutes || '60', 10)
        if (timeout > 0) {
          setSessionTimeout(timeout)
        }
      })
      .catch(() => {
        // Use default timeout if fetch fails
      })
  }, [])

  // Check session validity on mount and set up activity tracking
  useEffect(() => {
    const session = getStoredSession()

    if (session) {
      if (isSessionExpired(session.timestamp, sessionTimeout)) {
        // Session expired, clear it
        setStoredSession(null)
        setTeacher(null)
      } else {
        setTeacher(session.teacher)
        updateSessionTimestamp()
      }
    }

    setIsLoading(false)
  }, [sessionTimeout])

  // Activity tracking - update timestamp on user activity
  useEffect(() => {
    if (!teacher) return

    const handleActivity = () => {
      updateSessionTimestamp()

      // Reset the inactivity timer
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current)
      }

      activityTimeoutRef.current = setTimeout(
        () => {
          // Check if session is still valid
          const session = getStoredSession()
          if (session && isSessionExpired(session.timestamp, sessionTimeout)) {
            setTeacher(null)
            setStoredSession(null)
            router.push('/lehrer')
          }
        },
        sessionTimeout * 60 * 1000
      )
    }

    // Track user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }))

    // Initial timer
    handleActivity()

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity))
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current)
      }
    }
  }, [teacher, sessionTimeout, router])

  const login = useCallback(async (email: string, password: string): Promise<Teacher> => {
    const response = await api.teachers.login(email, password)
    const loggedInTeacher = response.data
    setTeacher(loggedInTeacher)
    setStoredSession(loggedInTeacher)
    return loggedInTeacher
  }, [])

  const logout = useCallback(() => {
    setTeacher(null)
    setStoredSession(null)
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current)
    }
    router.push('/lehrer')
  }, [router])

  const updateTeacher = useCallback((updatedTeacher: Teacher) => {
    setTeacher(updatedTeacher)
    setStoredSession(updatedTeacher)
  }, [])

  return {
    teacher,
    isLoading,
    isAuthenticated: !!teacher,
    login,
    logout,
    updateTeacher,
  }
}

export function useRequireAuth(redirectTo = '/lehrer') {
  const { teacher, isLoading, isAuthenticated, logout, updateTeacher } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo)
    }
  }, [isLoading, isAuthenticated, router, redirectTo])

  return { teacher, isLoading, isAuthenticated, logout, updateTeacher }
}

export function useRequireAdmin(redirectTo = '/lehrer/dashboard') {
  const auth = useRequireAuth()
  const router = useRouter()

  useEffect(() => {
    if (!auth.isLoading && auth.teacher && !auth.teacher.isAdmin) {
      router.push(redirectTo)
    }
  }, [auth.isLoading, auth.teacher, router, redirectTo])

  return auth
}
