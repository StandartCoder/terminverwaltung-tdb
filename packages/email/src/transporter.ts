import { createTransport, type Transporter } from 'nodemailer'

export interface EmailConfig {
  host: string
  port: number
  secure: boolean
  from: string
}

export type EmailTransporter = Transporter

const DEFAULT_CONFIG: EmailConfig = {
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT) || 1025,
  secure: false,
  from: process.env.SMTP_FROM || 'noreply@osz-teltow.de',
}

let transporter: Transporter | null = null

export function createEmailTransporter(config: Partial<EmailConfig> = {}): Transporter {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  transporter = createTransport({
    host: finalConfig.host,
    port: finalConfig.port,
    secure: finalConfig.secure,
  })

  return transporter
}

export function getTransporter(): Transporter {
  if (!transporter) {
    transporter = createEmailTransporter()
  }
  return transporter
}

export function getFromAddress(): string {
  return DEFAULT_CONFIG.from
}

export function formatFromAddress(fromName?: string): string {
  const email = DEFAULT_CONFIG.from
  if (fromName && fromName.trim()) {
    return `"${fromName}" <${email}>`
  }
  return email
}

export function getPublicUrl(): string {
  return process.env.PUBLIC_URL || 'http://localhost:3000'
}
