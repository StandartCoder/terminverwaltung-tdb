# Terminverwaltung - Tag der Betriebe

Appointment booking system for "Tag der Betriebe" at OSZ Teltow.

## Production Deployment

### One-Liner Installation

```bash
curl -sSL https://raw.githubusercontent.com/StandartCoder/terminverwaltug-tdb/main/install.sh | sudo bash
```

This will:

1. Install Docker if not present (Ubuntu/Debian/CentOS/Alpine)
2. Download the pre-built Docker image
3. Auto-generate all security secrets
4. Prompt for domain and optional SMTP settings
5. Start all services
6. Create a `terminverwaltung` CLI for management

### After Installation

```bash
# View status
terminverwaltung status

# View logs
terminverwaltung logs

# Update to latest version
terminverwaltung update

# Create database backup
terminverwaltung backup
```

### First Login

Navigate to your domain and login with default admin:

| Email               | Password |
| ------------------- | -------- |
| admin@osz-teltow.de | admin123 |

**You will be required to change the password on first login.**

---

## Development Setup

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Node.js 20+](https://nodejs.org/)
- [pnpm](https://pnpm.io/installation)

### 1. Install Dependencies

```bash
git clone https://github.com/StandartCoder/terminverwaltung-tdb
cd terminverwaltung-tdb

make setup
```

### 2. Start Development

```bash
make dev
```

This starts:

- PostgreSQL database (port 5432)
- Mailpit email catcher (port 8025)
- Next.js frontend (port 3000)
- Hono API (port 3001)

### 3. Seed Test Data (first time only)

```bash
make db-seed
```

### Development URLs

| Service       | URL                   |
| ------------- | --------------------- |
| App           | http://localhost:3000 |
| API           | http://localhost:3001 |
| Mailpit       | http://localhost:8025 |
| Prisma Studio | `make db-studio`      |

---

## Make Commands

```
Development:
  make dev            Start dev servers (auto-starts postgres/mailpit)
  make dev-services   Start only Docker services
  make dev-stop       Stop dev Docker services
  make build          Build all packages

Database:
  make db-migrate     Run migrations
  make db-seed        Seed test data
  make db-studio      Open Prisma Studio

Testing:
  make test           Run all tests
  make typecheck      Run TypeScript checks
  make lint           Run ESLint

Setup:
  make setup          First-time setup
  make clean          Stop everything, delete all data and node_modules
  make clean-docker   Stop Docker and delete volumes only
```

---

## Environment Variables

| Variable              | Required | Description                           |
| --------------------- | -------- | ------------------------------------- |
| `DATABASE_URL`        | Yes      | PostgreSQL connection string          |
| `NEXT_PUBLIC_APP_URL` | Yes      | Public URL of the web app             |
| `NEXT_PUBLIC_API_URL` | Yes      | Public URL of the API                 |
| `CORS_ORIGIN`         | Yes      | Allowed CORS origin (same as APP_URL) |
| `JWT_SECRET`          | Yes      | Auth encryption key (auto-generated)  |
| `JWT_REFRESH_SECRET`  | Yes      | Refresh token key (auto-generated)    |
| `CRON_SECRET`         | Yes      | Cron job auth key (auto-generated)    |
| `SMTP_HOST`           | No       | SMTP server for emails                |
| `SMTP_PORT`           | No       | SMTP port (default: 587)              |
| `SMTP_USER`           | No       | SMTP username                         |
| `SMTP_PASSWORD`       | No       | SMTP password                         |
| `SMTP_FROM`           | No       | From address for emails               |

---

## Project Structure

```
terminverwaltung-tdb/
├── apps/
│   ├── web/              # Next.js frontend
│   └── api/              # Hono API backend
├── packages/
│   ├── database/         # Prisma schema & migrations
│   ├── email/            # Email templates
│   ├── validators/       # Zod schemas
│   ├── auth/             # Auth utilities (bcrypt, JWT)
│   └── shared/           # Shared constants
├── scripts/              # Docker & cron scripts
├── install.sh            # One-liner production installer
├── docker-compose.yml    # Production (via install.sh)
├── docker-compose.dev.yml# Development services
├── Dockerfile            # All-in-one production image
└── Makefile              # Development shortcuts
```

---

## Features

- Public booking without registration
- Self-service booking management via email code
- Teacher dashboard with availability management
- Admin panel for departments, teachers, events
- Email notifications (confirmations & reminders)
- CSV and print-friendly exports
- Automatic reminder cron job

---

## Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS, shadcn/ui
- **Backend:** Hono, Prisma
- **Database:** PostgreSQL (embedded in Docker)
- **Auth:** JWT with httpOnly cookies, bcrypt
- **Build:** Turborepo, pnpm
- **Deploy:** Docker, GitHub Container Registry