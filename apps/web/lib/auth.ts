'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError, type Teacher } from './api'

const DEFAULT_SESSION_TIMEOUT_MINUTES = 60

export interface AuthState {
  teacher: Teacher | null
  isLoading: boolean
  isAuthenticated: boolean
}

export function useAuth() {
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionTimeout, setSessionTimeout] = useState(DEFAULT_SESSION_TIMEOUT_MINUTES)
  const router = useRouter()
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  // Check authentication on mount by calling /me endpoint
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.teachers.me()
        setTeacher(response.data)
      } catch (error) {
        // Not authenticated or token expired
        if (error instanceof ApiError && error.status === 401) {
          // Try to refresh token
          try {
            const refreshResponse = await api.teachers.refresh()
            setTeacher(refreshResponse.data.teacher)
          } catch {
            // Refresh failed, user is not authenticated
            setTeacher(null)
          }
        } else {
          setTeacher(null)
        }
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Set up token refresh interval (refresh 2 minutes before expiry)
  // Access token expires in 15 minutes, so refresh every 13 minutes
  useEffect(() => {
    if (!teacher) {
      if (refreshTimeoutRef.current) {
        clearInterval(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }
      return
    }

    const refreshInterval = 13 * 60 * 1000 // 13 minutes

    refreshTimeoutRef.current = setInterval(async () => {
      try {
        const response = await api.teachers.refresh()
        setTeacher(response.data.teacher)
      } catch {
        // Refresh failed, log out
        setTeacher(null)
        router.push('/lehrer')
      }
    }, refreshInterval)

    return () => {
      if (refreshTimeoutRef.current) {
        clearInterval(refreshTimeoutRef.current)
      }
    }
  }, [teacher, router])

  // Activity tracking for session timeout
  useEffect(() => {
    if (!teacher) return

    let lastActivity = Date.now()

    const handleActivity = () => {
      lastActivity = Date.now()

      // Reset the inactivity timer
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current)
      }

      activityTimeoutRef.current = setTimeout(
        () => {
          const timeSinceLastActivity = Date.now() - lastActivity
          if (timeSinceLastActivity >= sessionTimeout * 60 * 1000) {
            // Session expired due to inactivity, log out
            api.teachers.logout().catch(() => {})
            setTeacher(null)
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
    const loggedInTeacher = response.data.teacher
    setTeacher(loggedInTeacher)
    return loggedInTeacher
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.teachers.logout()
    } catch {
      // Ignore logout errors
    }
    setTeacher(null)
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current)
    }
    if (refreshTimeoutRef.current) {
      clearInterval(refreshTimeoutRef.current)
    }
    router.push('/lehrer')
  }, [router])

  const updateTeacher = useCallback((updatedTeacher: Teacher) => {
    setTeacher(updatedTeacher)
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
