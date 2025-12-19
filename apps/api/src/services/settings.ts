import { db } from '@terminverwaltung/database'
import type { EmailSettings } from '@terminverwaltung/email'

// Default values for all settings
const DEFAULTS: Record<string, string> = {
  // General
  school_name: 'OSZ Teltow',
  school_email: 'info@osz-teltow.de',
  school_phone: '',
  public_url: 'http://localhost:3000',

  // Booking
  booking_enabled: 'true',
  allow_rebook: 'true',
  allow_cancel: 'true',
  max_bookings_per_company: '0', // 0 = unlimited
  booking_notice_hours: '0', // 0 = no restriction
  cancel_notice_hours: '0', // 0 = no restriction

  // Timeslots
  slot_duration_minutes: '20',
  slot_buffer_minutes: '0',
  day_start_time: '08:00',
  day_end_time: '18:00',

  // Companies
  large_company_threshold: '5',
  require_phone: 'false',
  require_contact_name: 'true',
  show_student_fields: 'true',
  show_parent_fields: 'true',

  // Email
  email_notifications: 'true',
  email_from_name: 'OSZ Teltow - Tag der Betriebe',
  email_reply_to: '',
  send_reminder: 'false',
  reminder_hours_before: '24',
  notify_teacher_on_booking: 'false',

  // Display
  event_title: 'Tag der Betriebe',
  welcome_message: '',
  confirmation_message: '',
  show_room_info: 'true',
  show_department_colors: 'true',

  // Security
  session_timeout_minutes: '60',
  min_password_length: '6',
  require_password_change: 'true',
}

// Simple in-memory cache with TTL
let cache: Record<string, string> = {}
let cacheTimestamp = 0
const CACHE_TTL_MS = 60_000 // 1 minute

async function loadSettings(): Promise<Record<string, string>> {
  const now = Date.now()

  if (now - cacheTimestamp < CACHE_TTL_MS && Object.keys(cache).length > 0) {
    return cache
  }

  const settings = await db.setting.findMany()
  const settingsMap: Record<string, string> = { ...DEFAULTS }

  for (const setting of settings) {
    settingsMap[setting.key] = setting.value
  }

  cache = settingsMap
  cacheTimestamp = now

  return settingsMap
}

export function invalidateSettingsCache(): void {
  cache = {}
  cacheTimestamp = 0
}

export async function getSetting(key: string): Promise<string> {
  const settings = await loadSettings()
  return settings[key] ?? DEFAULTS[key] ?? ''
}

export async function getSettingNumber(key: string): Promise<number> {
  const value = await getSetting(key)
  const num = parseInt(value, 10)
  return isNaN(num) ? 0 : num
}

export async function getSettingBoolean(key: string): Promise<boolean> {
  const value = await getSetting(key)
  return value === 'true'
}

export async function getAllSettings(): Promise<Record<string, string>> {
  return loadSettings()
}

// Public settings that can be exposed to the frontend without authentication
const PUBLIC_SETTING_KEYS = [
  'school_name',
  'school_phone',
  'public_url',
  'booking_enabled',
  'event_title',
  'welcome_message',
  'show_room_info',
  'show_department_colors',
  'show_student_fields',
  'show_parent_fields',
  'require_phone',
  'require_contact_name',
  'large_company_threshold',
  'session_timeout_minutes',
]

export async function getPublicSettings(): Promise<Record<string, string>> {
  const allSettings = await loadSettings()
  const publicSettings: Record<string, string> = {}

  for (const key of PUBLIC_SETTING_KEYS) {
    publicSettings[key] = allSettings[key] ?? ''
  }

  return publicSettings
}

export async function getEmailSettings(): Promise<EmailSettings> {
  const [schoolName, schoolEmail, schoolPhone, publicUrl, emailFromName, emailReplyTo] =
    await Promise.all([
      getSetting('school_name'),
      getSetting('school_email'),
      getSetting('school_phone'),
      getSetting('public_url'),
      getSetting('email_from_name'),
      getSetting('email_reply_to'),
    ])
  return { schoolName, schoolEmail, schoolPhone, publicUrl, emailFromName, emailReplyTo }
}
