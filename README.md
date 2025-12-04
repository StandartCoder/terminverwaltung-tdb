# Terminverwaltung TdB

Appointment management system for "Tag der Betriebe" (Company Day) at OSZ Teltow. Companies and parents can book consultation slots with teachers without requiring registration or login.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Features](#features)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Configuration](#configuration)
- [Development](#development)
- [Deployment](#deployment)
- [Test Credentials](#test-credentials)
- [License](#license)

---

## Overview

### Key Features

| Feature                 | Description                                                                      |
| ----------------------- | -------------------------------------------------------------------------------- |
| Public Booking          | Companies book slots without registration - contact info entered at booking time |
| Self-Service Management | View, cancel, or rebook appointments via unique code sent by email               |
| Sondertermin            | Automatic detection of large companies (5+ students) requiring special handling  |
| Teacher Dashboard       | Teachers manage their availability, view bookings, and configure settings        |
| Bulk Slot Generation    | Generate multiple time slots at once with configurable duration and buffer       |
| Admin Panel             | Admins manage departments, teachers, events, and system settings                 |
| Multi-Department        | Support for multiple departments with color coding                               |
| Event Management        | Activate/deactivate booking periods with date ranges                             |
| Email Notifications     | Booking confirmations, cancellations, and reminders                              |
| Export & Print          | CSV export and print-friendly booking lists                                      |
| DSGVO Compliance        | Cookie consent, privacy policy, and data protection                              |

### User Flows

```
Public (Companies/Parents)           Teachers                    Admins
─────────────────────────           ────────                    ──────
1. Select department                1. Login                    1. Login
2. Select date                      2. View dashboard           2. Manage departments
3. Select available slot            3. Generate time slots      3. Manage teachers
4. Enter company info               4. View/manage bookings     4. Manage events
5. Receive confirmation email       5. Export bookings          5. Configure settings
6. Manage booking via code          6. Change password          6. Export & statistics
```

---

## Tech Stack

| Layer      | Technology                                    |
| ---------- | --------------------------------------------- |
| Monorepo   | Turborepo + pnpm workspaces                   |
| Frontend   | Next.js 15, React 19, Tailwind CSS, shadcn/ui |
| Backend    | Hono (lightweight, edge-ready framework)      |
| Database   | PostgreSQL + Prisma ORM                       |
| Validation | Zod                                           |
| Email      | Nodemailer (Mailpit for development)          |
| Auth       | Custom session-based authentication           |
| CI/CD      | GitHub Actions                                |
| Container  | Docker + Docker Compose                       |

---

## Project Structure

```
terminverwaltung-tdb/
│
├── apps/
│   ├── web/                        # Next.js frontend
│   │   ├── app/
│   │   │   ├── page.tsx            # Public booking page
│   │   │   ├── buchung/verwalten/  # Booking management
│   │   │   ├── impressum/          # Legal notice
│   │   │   ├── datenschutz/        # Privacy policy
│   │   │   └── lehrer/             # Teacher area
│   │   │       ├── page.tsx        # Login
│   │   │       ├── dashboard/      # Dashboard with tabs
│   │   │       └── passwort-aendern/
│   │   ├── components/             # React components
│   │   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── cookie-banner.tsx   # DSGVO cookie consent
│   │   │   └── providers.tsx       # React Query provider
│   │   ├── hooks/                  # Custom hooks
│   │   └── lib/                    # Utilities, API client
│   │
│   └── api/                        # Hono REST API
│       └── src/
│           ├── routes/             # API route handlers
│           │   ├── bookings.ts
│           │   ├── cron.ts         # Reminder system
│           │   ├── departments.ts
│           │   ├── events.ts
│           │   ├── export.ts
│           │   ├── health.ts
│           │   ├── settings.ts
│           │   ├── teachers.ts
│           │   └── timeslots.ts
│           ├── services/           # Business logic
│           └── index.ts            # App entry point
│
├── packages/
│   ├── database/                   # Prisma schema and client
│   │   └── prisma/
│   │       ├── schema.prisma       # Database schema
│   │       ├── migrations/         # Database migrations
│   │       └── seed.ts             # Seed data
│   ├── email/                      # Email templates and sending
│   │   └── src/
│   │       ├── booking-emails.ts   # Booking email templates
│   │       ├── transporter.ts      # SMTP configuration
│   │       └── index.ts
│   ├── auth/                       # Authentication utilities
│   ├── shared/                     # Shared constants and utilities
│   ├── validators/                 # Shared Zod schemas
│   ├── eslint-config/              # Shared ESLint configs
│   └── typescript-config/          # Shared TypeScript configs
│
├── docs/                           # Project documentation
├── .github/workflows/              # CI/CD pipelines
├── docker-compose.yml              # Local development services
└── Dockerfile                      # Production container
```

---

## Prerequisites

| Requirement    | Version |
| -------------- | ------- |
| Node.js        | 20+     |
| pnpm           | 9+      |
| Docker         | Latest  |
| Docker Compose | Latest  |

---

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/StandartCoder/terminverwaltung-tbd
cd terminverwaltung-tbd
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

| Variable              | Description                  | Default                                                          |
| --------------------- | ---------------------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`        | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/terminverwaltung` |
| `NEXT_PUBLIC_API_URL` | API URL for frontend         | `http://localhost:3001`                                          |
| `SMTP_HOST`           | SMTP server host             | `localhost`                                                      |
| `SMTP_PORT`           | SMTP server port             | `1025`                                                           |
| `SMTP_USER`           | SMTP username                | -                                                                |
| `SMTP_PASS`           | SMTP password                | -                                                                |
| `EMAIL_FROM`          | Default sender email         | `noreply@osz-teltow.de`                                          |

### 3. Start Services

```bash
docker-compose up -d
```

This starts:

| Service      | Port | Description         |
| ------------ | ---- | ------------------- |
| PostgreSQL   | 5432 | Database            |
| Mailpit SMTP | 1025 | Email server (dev)  |
| Mailpit UI   | 8025 | Email web interface |

### 4. Setup Database

```bash
pnpm db:generate    # Generate Prisma client
pnpm db:push        # Push schema to database
pnpm db:seed        # Seed with sample data
```

### 5. Start Development

```bash
pnpm dev
```

| Application | URL                   |
| ----------- | --------------------- |
| Web App     | http://localhost:3000 |
| API         | http://localhost:3001 |
| Mailpit     | http://localhost:8025 |

---

## Available Scripts

| Command            | Description                        |
| ------------------ | ---------------------------------- |
| `pnpm dev`         | Start all apps in development mode |
| `pnpm build`       | Build all apps for production      |
| `pnpm lint`        | Run ESLint on all packages         |
| `pnpm typecheck`   | Type check all packages            |
| `pnpm format`      | Format code with Prettier          |
| `pnpm db:generate` | Generate Prisma client             |
| `pnpm db:push`     | Push schema to database            |
| `pnpm db:migrate`  | Run database migrations            |
| `pnpm db:seed`     | Seed database with sample data     |
| `pnpm db:studio`   | Open Prisma Studio                 |

---

## Features

### Public Booking Flow

1. **Department Selection** - Choose from available departments
2. **Date Selection** - Pick from dates with available slots
3. **Time Slot Selection** - Select an available slot with teacher info
4. **Booking Form** - Enter company and contact information
5. **Confirmation** - Receive booking code and email confirmation

### Sondertermin (Special Appointments)

For companies with 5 or more apprentices, the system automatically:

- Displays a warning about requiring a special appointment
- Blocks the regular booking form
- Instructs users to contact the teacher directly

### Teacher Dashboard

- **Overview Tab** - Today's schedule, next appointments, statistics
- **Appointments Tab** - Bulk slot generation, manage individual slots
- **Settings Tab** (Admin) - System-wide configuration

### Admin Features

- **Department Management** - Create, edit, delete departments with colors
- **Teacher Management** - Add teachers, reset passwords, toggle admin/active status
- **Event Management** - Create and activate booking periods
- **Settings** - Configure slot duration, email settings, booking requirements
- **Export** - CSV download and print-friendly reports

### Email Notifications

| Email Type           | Trigger                   |
| -------------------- | ------------------------- |
| Booking Confirmation | New booking created       |
| Cancellation Notice  | Booking cancelled         |
| Rebook Confirmation  | Booking rescheduled       |
| Reminder             | Configurable hours before |

### DSGVO Compliance

- Cookie consent banner with accept/decline
- Comprehensive privacy policy (Datenschutzerklärung)
- Legal notice (Impressum)
- Only essential cookies used
- Data minimization principles applied

---

## API Reference

Base URL: `http://localhost:3001`

### Health

| Method | Endpoint        | Description                   |
| ------ | --------------- | ----------------------------- |
| GET    | `/health`       | Health check                  |
| GET    | `/health/ready` | Readiness check (includes DB) |

### Events

| Method | Endpoint             | Description      |
| ------ | -------------------- | ---------------- |
| GET    | `/api/events`        | List all events  |
| GET    | `/api/events/active` | Get active event |
| GET    | `/api/events/:id`    | Get event by ID  |
| POST   | `/api/events`        | Create event     |
| PATCH  | `/api/events/:id`    | Update event     |
| DELETE | `/api/events/:id`    | Delete event     |

### Departments

| Method | Endpoint               | Description                  |
| ------ | ---------------------- | ---------------------------- |
| GET    | `/api/departments`     | List all departments         |
| GET    | `/api/departments/:id` | Get department with teachers |
| POST   | `/api/departments`     | Create department            |
| PATCH  | `/api/departments/:id` | Update department            |
| DELETE | `/api/departments/:id` | Delete department            |

### Teachers

| Method | Endpoint                            | Description                |
| ------ | ----------------------------------- | -------------------------- |
| GET    | `/api/teachers`                     | List teachers              |
| GET    | `/api/teachers/:id`                 | Get teacher with timeslots |
| POST   | `/api/teachers`                     | Create teacher             |
| POST   | `/api/teachers/login`               | Teacher login              |
| POST   | `/api/teachers/:id/change-password` | Change password            |
| POST   | `/api/teachers/:id/set-password`    | Set password (admin)       |
| PATCH  | `/api/teachers/:id`                 | Update teacher             |
| DELETE | `/api/teachers/:id`                 | Delete teacher             |

### Time Slots

| Method | Endpoint                    | Description                       |
| ------ | --------------------------- | --------------------------------- |
| GET    | `/api/timeslots`            | List timeslots (with filters)     |
| GET    | `/api/timeslots/available`  | List available slots              |
| GET    | `/api/timeslots/dates`      | List dates with available slots   |
| GET    | `/api/timeslots/settings`   | Get slot generation settings      |
| POST   | `/api/timeslots`            | Create single timeslot            |
| POST   | `/api/timeslots/bulk`       | Create multiple timeslots         |
| POST   | `/api/timeslots/generate`   | Generate slots with settings      |
| PATCH  | `/api/timeslots/:id/status` | Update status (AVAILABLE/BLOCKED) |
| DELETE | `/api/timeslots/:id`        | Delete timeslot                   |

### Bookings

| Method | Endpoint                    | Description                        |
| ------ | --------------------------- | ---------------------------------- |
| GET    | `/api/bookings`             | List bookings (with filters)       |
| GET    | `/api/bookings/check/:code` | Check booking by cancellation code |
| POST   | `/api/bookings`             | Create booking                     |
| POST   | `/api/bookings/cancel`      | Cancel booking                     |
| POST   | `/api/bookings/rebook`      | Rebook to different slot           |
| PATCH  | `/api/bookings/:id/status`  | Update booking status              |

### Settings

| Method | Endpoint               | Description           |
| ------ | ---------------------- | --------------------- |
| GET    | `/api/settings`        | List all settings     |
| GET    | `/api/settings/public` | Get public settings   |
| GET    | `/api/settings/:key`   | Get setting by key    |
| PUT    | `/api/settings`        | Create/update setting |
| PUT    | `/api/settings/bulk`   | Bulk update settings  |
| DELETE | `/api/settings/:key`   | Delete setting        |

### Export

| Method | Endpoint                     | Description                 |
| ------ | ---------------------------- | --------------------------- |
| GET    | `/api/export/bookings/csv`   | Export bookings as CSV      |
| GET    | `/api/export/bookings/print` | Print-friendly booking list |
| GET    | `/api/export/statistics`     | Get booking statistics      |

### Cron

| Method | Endpoint                   | Description             |
| ------ | -------------------------- | ----------------------- |
| POST   | `/api/cron/send-reminders` | Trigger reminder emails |

---

## Database Schema

### Entity Relationship

```
Department 1───* Teacher 1───* TimeSlot 1───1 Booking
                    │                           │
                    └──────────* Booking *──────┘
                                    │
                                    *
                                EmailLog

Event (standalone - defines booking periods)
Setting (key-value configuration)
```

### Models

| Model      | Description                                       |
| ---------- | ------------------------------------------------- |
| Department | Academic departments (IT, Business, Health, etc.) |
| Teacher    | Staff members who offer consultation slots        |
| TimeSlot   | Available time slots for bookings                 |
| Booking    | Appointment bookings with company information     |
| Event      | "Tag der Betriebe" event configuration            |
| Setting    | System-wide settings (key-value pairs)            |
| EmailLog   | Email delivery tracking                           |

### Key Enums

**TimeSlotStatus**

| Value     | Description                 |
| --------- | --------------------------- |
| AVAILABLE | Open for booking            |
| BOOKED    | Already booked              |
| BLOCKED   | Manually blocked by teacher |

**BookingStatus**

| Value     | Description                |
| --------- | -------------------------- |
| CONFIRMED | Active booking             |
| CANCELLED | Cancelled by user or admin |
| COMPLETED | Appointment completed      |
| NO_SHOW   | Client did not appear      |

---

## Configuration

### System Settings

Configure via Admin Dashboard → Settings:

| Setting                     | Description                            | Default |
| --------------------------- | -------------------------------------- | ------- |
| `slot_duration_minutes`     | Default slot duration                  | 20      |
| `slot_buffer_minutes`       | Buffer between slots                   | 5       |
| `day_start_time`            | Earliest slot time                     | 08:00   |
| `day_end_time`              | Latest slot end time                   | 16:00   |
| `large_company_threshold`   | Students count triggering Sondertermin | 5       |
| `require_phone`             | Require phone number for booking       | false   |
| `require_contact_name`      | Require contact person name            | true    |
| `show_student_fields`       | Show student name/class fields         | true    |
| `show_parent_fields`        | Show parent contact fields             | true    |
| `email_notifications`       | Enable email notifications             | true    |
| `send_reminder`             | Send reminder emails                   | true    |
| `reminder_hours_before`     | Hours before appointment for reminder  | 24      |
| `notify_teacher_on_booking` | Email teacher on new booking           | true    |
| `session_timeout_minutes`   | Teacher session timeout                | 480     |
| `min_password_length`       | Minimum password length                | 8       |

---

## Development

### Adding shadcn/ui Components

Components are in `apps/web/components/ui/`. To add more:

```bash
cd apps/web
npx shadcn@latest add <component-name>
```

### Database Changes

1. Edit `packages/database/prisma/schema.prisma`
2. Run migration:
   ```bash
   pnpm db:migrate --name your_migration_name
   ```
3. Update seed file if needed

### Adding API Endpoints

1. Create or edit route file in `apps/api/src/routes/`
2. Register route in `apps/api/src/index.ts`
3. Add types to `apps/web/lib/api.ts`

### Email Templates

Email templates are in `packages/email/src/booking-emails.ts`. They use simple HTML with inline styles for maximum compatibility.

---

## Deployment

### Docker

Build and run with Docker:

```bash
docker build -t terminverwaltung .
docker run -p 3000:3000 -p 3001:3001 terminverwaltung
```

### Environment Variables (Production)

| Variable       | Required | Description                  |
| -------------- | -------- | ---------------------------- |
| `DATABASE_URL` | Yes      | PostgreSQL connection string |
| `SMTP_HOST`    | Yes      | Production SMTP server       |
| `SMTP_PORT`    | Yes      | SMTP port (usually 587)      |
| `SMTP_USER`    | Yes      | SMTP authentication user     |
| `SMTP_PASS`    | Yes      | SMTP authentication password |
| `SMTP_SECURE`  | No       | Use TLS (default: false)     |
| `EMAIL_FROM`   | Yes      | Sender email address         |

---

## Test Credentials

After running `pnpm db:seed`:

| Role  | Email               | Password |
| ----- | ------------------- | -------- |
| Admin | admin@osz-teltow.de | admin123 |

> ⚠️ Change password immediately after first login!

---

## License

Private - All rights reserved

---

## Contributing

This is an internal project for OSZ Teltow. For questions or issues, contact the development team.
