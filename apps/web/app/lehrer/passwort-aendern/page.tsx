'use client'

import { GraduationCap, Lock } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import { useRequireAuth } from '@/lib/auth'

export default function ChangePasswordPage() {
  const { teacher, isLoading, updateTeacher } = useRequireAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Fehler',
        description: 'Die Passwörter stimmen nicht überein',
        variant: 'destructive',
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Fehler',
        description: 'Das neue Passwort muss mindestens 6 Zeichen lang sein',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      await api.teachers.changePassword(teacher!.id, currentPassword, newPassword)
      updateTeacher({ ...teacher!, mustChangePassword: false })
      toast({
        title: 'Passwort geändert',
        description: 'Ihr Passwort wurde erfolgreich geändert',
      })
      router.push('/lehrer/dashboard')
    } catch (error) {
      toast({
        title: 'Fehler',
        description:
          error instanceof Error ? error.message : 'Passwort konnte nicht geändert werden',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Laden...</div>
      </div>
    )
  }

  return (
    <div className="from-background to-muted/30 flex min-h-screen flex-col bg-gradient-to-b">
      <header className="bg-card/80 border-b backdrop-blur-sm">
        <div className="container flex h-16 items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-lg">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-none">OSZ Teltow</h1>
              <p className="text-muted-foreground text-sm">Tag der Betriebe</p>
            </div>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Passwort ändern</CardTitle>
            <CardDescription>
              {teacher?.mustChangePassword
                ? 'Bitte ändern Sie Ihr temporäres Passwort'
                : 'Ändern Sie Ihr Passwort'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">
                  <Lock className="mr-2 inline h-4 w-4" />
                  Aktuelles Passwort
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">
                  <Lock className="mr-2 inline h-4 w-4" />
                  Neues Passwort
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mindestens 6 Zeichen"
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  <Lock className="mr-2 inline h-4 w-4" />
                  Passwort bestätigen
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Wird gespeichert...' : 'Passwort ändern'}
              </Button>

              {!teacher?.mustChangePassword && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => router.push('/lehrer/dashboard')}
                >
                  Abbrechen
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
