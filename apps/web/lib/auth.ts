'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { api, type Teacher } from './api'

const AUTH_STORAGE_KEY = 'teacher_session'

export interface AuthState {
  teacher: Teacher | null
  isLoading: boolean
  isAuthenticated: boolean
}

function getStoredTeacher(): Teacher | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored) as Teacher
  } catch {
    return null
  }
}

function setStoredTeacher(teacher: Teacher | null): void {
  if (typeof window === 'undefined') return
  if (teacher) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(teacher))
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }
}

export function useAuth() {
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const stored = getStoredTeacher()
    setTeacher(stored)
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<Teacher> => {
    const response = await api.teachers.login(email, password)
    const loggedInTeacher = response.data
    setTeacher(loggedInTeacher)
    setStoredTeacher(loggedInTeacher)
    return loggedInTeacher
  }, [])

  const logout = useCallback(() => {
    setTeacher(null)
    setStoredTeacher(null)
    router.push('/lehrer')
  }, [router])

  const updateTeacher = useCallback((updatedTeacher: Teacher) => {
    setTeacher(updatedTeacher)
    setStoredTeacher(updatedTeacher)
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
