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
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Development](#development)
- [Test Credentials](#test-credentials)
- [License](#license)

---

## Overview

### Key Features

| Feature                   | Description                                                                      |
| ------------------------- | -------------------------------------------------------------------------------- |
| Public Booking            | Companies book slots without registration - contact info entered at booking time |
| Self-Service Cancellation | Cancellation via unique code sent by email                                       |
| Teacher Dashboard         | Teachers manage their availability and view bookings                             |
| Admin Panel               | Admins manage departments, teachers, and events                                  |
| Multi-Department          | Support for multiple departments (IT, Business, Health, etc.)                    |
| Event Management          | Activate/deactivate booking periods                                              |
| CSV Export                | Export bookings and statistics                                                   |
| Email Notifications       | Booking confirmations and cancellation notices                                   |

### User Flows

```
Public (Companies/Parents)           Teachers                    Admins
-------------------------           --------                    ------
1. Select department                1. Login                    1. Login
2. Select date                      2. View bookings            2. Manage departments
3. Select available slot            3. Manage timeslots         3. Manage teachers
4. Enter company info               4. Change password          4. Manage events
5. Receive confirmation email                                   5. Export data
6. Cancel via code (if needed)
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
| CI/CD      | GitHub Actions                                |

---

## Project Structure

```
terminverwaltung-tdb/
|
+-- apps/
|   +-- web/                    # Next.js frontend
|   |   +-- app/                # App router pages
|   |   |   +-- page.tsx        # Public booking page
|   |   |   +-- stornieren/     # Cancellation page
|   |   |   +-- lehrer/         # Teacher area
|   |   |       +-- page.tsx            # Login
|   |   |       +-- dashboard/          # Dashboard
|   |   |       +-- passwort-aendern/   # Password change
|   |   +-- components/         # React components
|   |   +-- hooks/              # Custom hooks
|   |   +-- lib/                # Utilities, API client
|   |
|   +-- api/                    # Hono REST API
|       +-- src/
|           +-- routes/         # API route handlers
|           +-- lib/            # Utilities, email, constants
|
+-- packages/
|   +-- database/               # Prisma schema and client
|   |   +-- prisma/
|   |       +-- schema.prisma   # Database schema
|   |       +-- seed.ts         # Seed data
|   +-- validators/             # Shared Zod schemas
|   +-- eslint-config/          # Shared ESLint configs
|   +-- typescript-config/      # Shared TypeScript configs
|
+-- docs/                       # Project documentation
+-- docker-compose.yml          # Local development services
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

| Variable              | Description                   | Default                                                          |
| --------------------- | ----------------------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`        | PostgreSQL connection string  | `postgresql://postgres:postgres@localhost:5433/terminverwaltung` |
| `NEXT_PUBLIC_APP_URL` | Frontend URL                  | `http://localhost:3000`                                          |
| `API_URL`             | API URL                       | `http://localhost:3001`                                          |
| `NEXTAUTH_SECRET`     | Secret for session encryption | -                                                                |

### 3. Start Services

```bash
docker-compose up -d
```

This starts:

| Service      | Port | Description         |
| ------------ | ---- | ------------------- |
| PostgreSQL   | 5432 | Database            |
| Redis        | 6379 | Cache (optional)    |
| Mailpit SMTP | 1025 | Email server        |
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
| GET    | `/api/teachers/:id/timeslots`       | Get teacher's timeslots    |
| GET    | `/api/teachers/:id/bookings`        | Get teacher's bookings     |
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
| GET    | `/api/timeslots/:id`        | Get timeslot                      |
| POST   | `/api/timeslots`            | Create timeslot                   |
| POST   | `/api/timeslots/bulk`       | Create multiple timeslots         |
| PATCH  | `/api/timeslots/:id/status` | Update status (AVAILABLE/BLOCKED) |
| DELETE | `/api/timeslots/:id`        | Delete timeslot                   |

### Bookings

| Method | Endpoint                    | Description                        |
| ------ | --------------------------- | ---------------------------------- |
| GET    | `/api/bookings`             | List bookings (with filters)       |
| GET    | `/api/bookings/:id`         | Get booking                        |
| GET    | `/api/bookings/check/:code` | Check booking by cancellation code |
| POST   | `/api/bookings`             | Create booking                     |
| POST   | `/api/bookings/cancel`      | Cancel booking                     |
| PATCH  | `/api/bookings/:id/status`  | Update booking status              |

### Export

| Method | Endpoint                    | Description             |
| ------ | --------------------------- | ----------------------- |
| GET    | `/api/export/bookings/csv`  | Export bookings as CSV  |
| GET    | `/api/export/timeslots/csv` | Export timeslots as CSV |
| GET    | `/api/export/statistics`    | Get booking statistics  |

### Settings

| Method | Endpoint             | Description           |
| ------ | -------------------- | --------------------- |
| GET    | `/api/settings`      | List all settings     |
| GET    | `/api/settings/:key` | Get setting by key    |
| PUT    | `/api/settings`      | Create/update setting |
| PUT    | `/api/settings/bulk` | Bulk update settings  |
| DELETE | `/api/settings/:key` | Delete setting        |

---

## Database Schema

### Entity Relationship

```
Department 1---* Teacher 1---* TimeSlot 1---1 Booking
                    |                           |
                    +----------*  Booking  *----+
                                    |
                                    *
                                EmailLog
```

### Models

| Model      | Description                                       |
| ---------- | ------------------------------------------------- |
| Department | Academic departments (IT, Business, Health, etc.) |
| Teacher    | Staff members who offer consultation slots        |
| TimeSlot   | Available time slots for bookings                 |
| Booking    | Appointment bookings with company information     |
| Event      | "Tag der Betriebe" event configuration            |
| Setting    | System-wide settings                              |
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

## Development

### Adding shadcn/ui Components

Components are in `apps/web/components/ui/`. To add more:

1. Create component file in `apps/web/components/ui/`
2. Follow shadcn/ui component patterns
3. Use `cn()` utility from `@/lib/utils`

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
3. Add validation schemas using Zod

---

## Test Credentials

After running `pnpm db:seed`:

| Role    | Email                 | Password  |
| ------- | --------------------- | --------- |
| Admin   | admin@osz-teltow.de   | admin123  |
| Teacher | mueller@osz-teltow.de | lehrer123 |

---

## License

Private - All rights reserved
