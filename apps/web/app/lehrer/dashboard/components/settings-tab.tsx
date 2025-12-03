'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Calendar, Clock, Mail, Save, Shield, Users } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'

interface SettingsTabProps {
  settingsMap: Record<string, string>
}

type SettingType = 'text' | 'email' | 'number' | 'boolean' | 'textarea' | 'time'

interface SettingConfig {
  key: string
  label: string
  description?: string
  type: SettingType
  placeholder?: string
  min?: number
  max?: number
  unit?: string
}

interface SettingGroup {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  settings: SettingConfig[]
}

const SETTING_GROUPS: SettingGroup[] = [
  {
    id: 'general',
    title: 'Allgemein',
    description: 'Grundlegende Systemeinstellungen',
    icon: <Building2 className="h-5 w-5" />,
    settings: [
      {
        key: 'school_name',
        label: 'Schulname',
        description: 'Name der Schule für E-Mails und Anzeigen',
        type: 'text',
        placeholder: 'OSZ Teltow',
      },
      {
        key: 'school_email',
        label: 'Schul-E-Mail',
        description: 'Kontakt-E-Mail für Rückfragen',
        type: 'email',
        placeholder: 'info@osz-teltow.de',
      },
      {
        key: 'school_phone',
        label: 'Telefonnummer',
        description: 'Telefonnummer für Rückfragen',
        type: 'text',
        placeholder: '+49 3328 1234567',
      },
      {
        key: 'public_url',
        label: 'Öffentliche URL',
        description: 'URL der Buchungsseite (für E-Mail-Links)',
        type: 'text',
        placeholder: 'https://tdb.osz-teltow.de',
      },
    ],
  },
  {
    id: 'booking',
    title: 'Buchungen',
    description: 'Einstellungen für das Buchungssystem',
    icon: <Calendar className="h-5 w-5" />,
    settings: [
      {
        key: 'booking_enabled',
        label: 'Buchungen aktiviert',
        description: 'Können Betriebe neue Termine buchen?',
        type: 'boolean',
      },
      {
        key: 'allow_rebook',
        label: 'Umbuchungen erlauben',
        description: 'Können Betriebe gebuchte Termine umbuchen?',
        type: 'boolean',
      },
      {
        key: 'allow_cancel',
        label: 'Stornierungen erlauben',
        description: 'Können Betriebe Termine selbst stornieren?',
        type: 'boolean',
      },
      {
        key: 'max_bookings_per_company',
        label: 'Max. Buchungen pro Betrieb',
        description: 'Maximale Anzahl Termine pro E-Mail-Adresse (0 = unbegrenzt)',
        type: 'number',
        min: 0,
        max: 50,
      },
      {
        key: 'booking_notice_hours',
        label: 'Vorlaufzeit für Buchungen',
        description: 'Wie viele Stunden vor Terminbeginn kann noch gebucht werden?',
        type: 'number',
        min: 0,
        max: 168,
        unit: 'Stunden',
      },
      {
        key: 'cancel_notice_hours',
        label: 'Vorlaufzeit für Stornierung',
        description: 'Wie viele Stunden vor Terminbeginn kann noch storniert werden?',
        type: 'number',
        min: 0,
        max: 168,
        unit: 'Stunden',
      },
    ],
  },
  {
    id: 'timeslots',
    title: 'Zeitslots',
    description: 'Standard-Einstellungen für Termine',
    icon: <Clock className="h-5 w-5" />,
    settings: [
      {
        key: 'slot_duration_minutes',
        label: 'Standard-Terminlänge',
        description: 'Dauer eines Termins in Minuten',
        type: 'number',
        min: 5,
        max: 120,
        unit: 'Minuten',
      },
      {
        key: 'slot_buffer_minutes',
        label: 'Pause zwischen Terminen',
        description: 'Puffer zwischen aufeinanderfolgenden Terminen',
        type: 'number',
        min: 0,
        max: 30,
        unit: 'Minuten',
      },
      {
        key: 'day_start_time',
        label: 'Tagesbeginn',
        description: 'Frühester Terminbeginn',
        type: 'time',
        placeholder: '08:00',
      },
      {
        key: 'day_end_time',
        label: 'Tagesende',
        description: 'Spätestes Terminende',
        type: 'time',
        placeholder: '18:00',
      },
    ],
  },
  {
    id: 'companies',
    title: 'Betriebe',
    description: 'Einstellungen für Betriebe und Buchungsformular',
    icon: <Users className="h-5 w-5" />,
    settings: [
      {
        key: 'large_company_threshold',
        label: 'Großbetrieb ab',
        description: 'Ab wie vielen Azubis gilt ein Betrieb als Großbetrieb?',
        type: 'number',
        min: 1,
        max: 100,
        unit: 'Azubis',
      },
      {
        key: 'require_phone',
        label: 'Telefonnummer erforderlich',
        description: 'Muss bei der Buchung eine Telefonnummer angegeben werden?',
        type: 'boolean',
      },
      {
        key: 'require_contact_name',
        label: 'Ansprechpartner erforderlich',
        description: 'Muss ein Ansprechpartner angegeben werden?',
        type: 'boolean',
      },
      {
        key: 'show_student_fields',
        label: 'Azubi-Felder anzeigen',
        description: 'Felder für Azubi-Name und Klasse im Buchungsformular anzeigen',
        type: 'boolean',
      },
      {
        key: 'show_parent_fields',
        label: 'Eltern-Felder anzeigen',
        description: 'Felder für Eltern-Kontakt im Buchungsformular anzeigen',
        type: 'boolean',
      },
    ],
  },
  {
    id: 'email',
    title: 'E-Mail',
    description: 'E-Mail-Benachrichtigungen konfigurieren',
    icon: <Mail className="h-5 w-5" />,
    settings: [
      {
        key: 'email_notifications',
        label: 'E-Mail-Benachrichtigungen',
        description: 'Sollen E-Mails an Betriebe gesendet werden?',
        type: 'boolean',
      },
      {
        key: 'email_from_name',
        label: 'Absendername',
        description: 'Name des E-Mail-Absenders',
        type: 'text',
        placeholder: 'OSZ Teltow - Tag der Betriebe',
      },
      {
        key: 'email_reply_to',
        label: 'Antwort-Adresse',
        description: 'E-Mail-Adresse für Antworten',
        type: 'email',
        placeholder: 'tdb@osz-teltow.de',
      },
      {
        key: 'send_reminder',
        label: 'Erinnerungen senden',
        description: 'Automatische Terminerinnerungen an Betriebe senden',
        type: 'boolean',
      },
      {
        key: 'reminder_hours_before',
        label: 'Erinnerung vor Termin',
        description: 'Wie viele Stunden vor dem Termin soll erinnert werden?',
        type: 'number',
        min: 1,
        max: 72,
        unit: 'Stunden',
      },
      {
        key: 'notify_teacher_on_booking',
        label: 'Lehrkraft benachrichtigen',
        description: 'Lehrkraft per E-Mail über neue Buchungen informieren',
        type: 'boolean',
      },
    ],
  },

  {
    id: 'security',
    title: 'Sicherheit',
    description: 'Sicherheitseinstellungen',
    icon: <Shield className="h-5 w-5" />,
    settings: [
      {
        key: 'session_timeout_minutes',
        label: 'Session-Timeout',
        description: 'Nach wie vielen Minuten Inaktivität wird man ausgeloggt?',
        type: 'number',
        min: 5,
        max: 480,
        unit: 'Minuten',
      },
      {
        key: 'min_password_length',
        label: 'Minimale Passwortlänge',
        description: 'Mindestanzahl Zeichen für Passwörter',
        type: 'number',
        min: 6,
        max: 32,
        unit: 'Zeichen',
      },
      {
        key: 'require_password_change',
        label: 'Passwortänderung erzwingen',
        description: 'Neue Lehrkräfte müssen Passwort beim ersten Login ändern',
        type: 'boolean',
      },
    ],
  },
]

function SettingInput({
  config,
  value,
  onChange,
}: {
  config: SettingConfig
  value: string
  onChange: (value: string) => void
}) {
  switch (config.type) {
    case 'boolean':
      return (
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={value === 'true'}
            onClick={() => onChange(value === 'true' ? 'false' : 'true')}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              value === 'true' ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                value === 'true' ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="text-muted-foreground text-sm">
            {value === 'true' ? 'Aktiviert' : 'Deaktiviert'}
          </span>
        </div>
      )

    case 'textarea':
      return (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={config.placeholder}
          rows={3}
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        />
      )

    case 'number':
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            min={config.min}
            max={config.max}
            className="w-32"
          />
          {config.unit && <span className="text-muted-foreground text-sm">{config.unit}</span>}
        </div>
      )

    case 'time':
      return (
        <Input
          type="time"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-32"
        />
      )

    default:
      return (
        <Input
          type={config.type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={config.placeholder}
        />
      )
  }
}

export function SettingsTab({ settingsMap }: SettingsTabProps) {
  const [values, setValues] = useState(settingsMap)
  const [activeGroup, setActiveGroup] = useState(SETTING_GROUPS[0].id)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: () =>
      api.settings.bulkUpdate(Object.entries(values).map(([key, value]) => ({ key, value }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast({ title: 'Gespeichert', description: 'Einstellungen wurden erfolgreich gespeichert.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler beim Speichern', description: error.message, variant: 'destructive' })
    },
  })

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const currentGroup = SETTING_GROUPS.find((g) => g.id === activeGroup) || SETTING_GROUPS[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Einstellungen</h2>
          <p className="text-muted-foreground">Systemweite Konfiguration verwalten</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="lg">
          <Save className="mr-2 h-4 w-4" />
          {saveMutation.isPending ? 'Speichere...' : 'Alle Änderungen speichern'}
        </Button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar Navigation */}
        <nav className="lg:w-64 lg:shrink-0">
          <div className="bg-card sticky top-20 space-y-1 rounded-lg border p-2">
            {SETTING_GROUPS.map((group) => (
              <button
                key={group.id}
                onClick={() => setActiveGroup(group.id)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  activeGroup === group.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {group.icon}
                <span className="font-medium">{group.title}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Settings Content */}
        <div className="flex-1">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
                  {currentGroup.icon}
                </div>
                <div>
                  <CardTitle>{currentGroup.title}</CardTitle>
                  <CardDescription>{currentGroup.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {currentGroup.settings.map((config) => (
                  <div
                    key={config.key}
                    className="grid gap-2 border-b pb-6 last:border-0 last:pb-0 sm:grid-cols-2 sm:gap-4"
                  >
                    <div>
                      <Label htmlFor={config.key} className="text-base font-medium">
                        {config.label}
                      </Label>
                      {config.description && (
                        <p className="text-muted-foreground mt-1 text-sm">{config.description}</p>
                      )}
                    </div>
                    <div className="flex items-start">
                      <SettingInput
                        config={config}
                        value={values[config.key] || ''}
                        onChange={(value) => handleChange(config.key, value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
