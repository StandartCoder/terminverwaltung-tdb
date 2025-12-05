# Terminverwaltung

Appointment booking system for "Tag der Betriebe" at OSZ Teltow.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Node.js 20+](https://nodejs.org/) (for development only)
- [pnpm](https://pnpm.io/installation) (for development only)

---

## Production Deployment

### 1. Clone & Configure

```bash
git clone https://github.com/your-repo/terminverwaltung-tbd
cd terminverwaltung-tbd

# Create config
cp .env.example .env
```

### 2. Generate Secrets

```bash
make gen-secrets
```

Copy the output into your `.env` file.

### 3. Edit Configuration

```bash
nano .env   # or your editor of choice
```

Required changes for production:

```bash
# Your domain
NEXT_PUBLIC_APP_URL="https://termine.your-school.de"
NEXT_PUBLIC_API_URL="https://termine.your-school.de/api"
NEXTAUTH_URL="https://termine.your-school.de"

# Paste generated secrets here
NEXTAUTH_SECRET="paste-generated-secret"
CRON_SECRET="paste-generated-secret"

# Email (required for confirmations)
SMTP_HOST="smtp.your-provider.de"
SMTP_PORT=587
SMTP_USER="your-email@your-school.de"
SMTP_PASSWORD="your-password"
SMTP_FROM="termine@your-school.de"
```

### 4. Start

```bash
make docker-up
```

### 5. Verify

```bash
# Check status
make docker-logs

# Open browser
open http://localhost:3000
```

### 6. First Login

Navigate to `/lehrer` and login with default admin:

| Email               | Password |
| ------------------- | -------- |
| admin@osz-teltow.de | admin123 |

**Change this password immediately in production!**

---

## Development Setup

### 1. Install Dependencies

```bash
git clone https://github.com/your-repo/terminverwaltung-tbd
cd terminverwaltung-tbd

make setup
```

### 2. Configure

```bash
# .env is created automatically, but edit if needed
nano .env
```

### 3. Start Everything

```bash
make dev
```

This starts:

- PostgreSQL database (port 5432)
- Mailpit email catcher (port 8025)
- Next.js frontend (port 3000)
- Hono API (port 3001)

### 4. Seed Test Data (first time only)

```bash
make db-seed
```

### 5. Open

| Service       | URL                   |
| ------------- | --------------------- |
| App           | http://localhost:3000 |
| API           | http://localhost:3001 |
| Mailpit       | http://localhost:8025 |
| Prisma Studio | `make db-studio`      |

---

## Make Commands

Run `make help` to see all commands:

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

Docker (Production):
  make docker-up      Build and start container
  make docker-down    Stop container
  make docker-logs    View logs
  make docker-shell   Shell into container

Utilities:
  make setup          First-time setup
  make gen-secrets    Generate secrets for .env
  make clean          Stop everything, delete all data and node_modules
  make clean-docker   Stop Docker and delete volumes only
```

---

## Environment Variables

| Variable              | Required | Description                                            |
| --------------------- | -------- | ------------------------------------------------------ |
| `DATABASE_URL`        | Yes      | PostgreSQL connection string                           |
| `NEXT_PUBLIC_APP_URL` | Yes      | Public URL of the web app                              |
| `NEXT_PUBLIC_API_URL` | Yes      | Public URL of the API                                  |
| `NEXTAUTH_URL`        | Yes      | Same as APP_URL                                        |
| `NEXTAUTH_SECRET`     | Yes      | Auth encryption key (generate with `make gen-secrets`) |
| `CRON_SECRET`         | Yes      | Cron job auth key (generate with `make gen-secrets`)   |
| `SMTP_HOST`           | No       | SMTP server for emails                                 |
| `SMTP_PORT`           | No       | SMTP port (default: 587)                               |
| `SMTP_USER`           | No       | SMTP username                                          |
| `SMTP_PASSWORD`       | No       | SMTP password                                          |
| `SMTP_FROM`           | No       | From address for emails                                |

---

## Project Structure

```
terminverwaltung-tbd/
├── apps/
│   ├── web/              # Next.js frontend
│   └── api/              # Hono API backend
├── packages/
│   ├── database/         # Prisma schema & migrations
│   ├── email/            # Email templates
│   ├── validators/       # Zod schemas
│   ├── auth/             # Auth utilities
│   └── shared/           # Shared constants
├── scripts/              # Docker & cron scripts
├── docker-compose.yml    # Production
├── docker-compose.dev.yml# Development services
├── Dockerfile            # All-in-one production image
└── Makefile              # Command shortcuts
```

---

## Common Tasks

### Reset Database (Development)

```bash
make clean
make dev
make db-seed
```

### View Logs

```bash
# Production
make docker-logs

# Development - logs appear in terminal
```

### Update Dependencies

```bash
pnpm update
make build
```

### Access Database Directly

```bash
# Development
docker exec -it terminverwaltung-db psql -U postgres -d terminverwaltung

# Production
make docker-shell
psql -U postgres -d terminverwaltung
```

### Backup Database (Production)

```bash
docker exec terminverwaltung-app pg_dump -U postgres terminverwaltung > backup.sql
```

### Restore Database

```bash
cat backup.sql | docker exec -i terminverwaltung-app psql -U postgres terminverwaltung
```

---

## Troubleshooting

### Port already in use

```bash
make clean-docker
make dev   # or make docker-up
```

### Database connection failed

```bash
# Check if containers are running
docker ps

# Check logs
make docker-logs
```

### Build errors

```bash
make clean
pnpm install
make build
```

### Email not sending

1. Check SMTP settings in `.env`
2. In development, check Mailpit at http://localhost:8025
3. Check API logs for errors

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
- **Database:** PostgreSQL
- **Auth:** NextAuth.js
- **Build:** Turborepo, pnpm
- **Deploy:** Docker

---

## License

Private - OSZ Teltow
