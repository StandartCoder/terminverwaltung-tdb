'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface BookingCodeFormProps {
  code: string
  onCodeChange: (code: string) => void
  onSearch: (e: React.FormEvent) => void
  isLoading: boolean
}

export function BookingCodeForm({ code, onCodeChange, onSearch, isLoading }: BookingCodeFormProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Buchungscode</CardTitle>
        <CardDescription>Den Code finden Sie in Ihrer Bestätigungs-E-Mail</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSearch} className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="Buchungscode eingeben"
            className="font-mono"
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Suche...' : 'Suchen'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
