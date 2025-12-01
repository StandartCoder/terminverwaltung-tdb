# Terminverwaltung TdB

Professional appointment management system built with modern technologies.

## Tech Stack

- **Monorepo**: Turborepo with pnpm workspaces
- **Frontend**: Next.js 15, React 18, Tailwind CSS, shadcn/ui
- **Backend**: Hono (lightweight, edge-ready API framework)
- **Database**: PostgreSQL with Prisma ORM
- **Testing**: Vitest
- **CI/CD**: GitHub Actions

## Project Structure

```
terminverwaltung-tdb/
├── apps/
│   ├── web/          # Next.js frontend application
│   └── api/          # Hono REST API
├── packages/
│   ├── database/     # Prisma schema and client
│   ├── eslint-config/# Shared ESLint configurations
│   └── typescript-config/ # Shared TypeScript configurations
├── docs/             # Project documentation
└── docker-compose.yml
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose (for local database)

## Getting Started

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd terminverwaltung-tbd
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your configuration.

### 3. Start local services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5433
- Redis on port 6379
- MailHog on ports 1025 (SMTP) and 8025 (Web UI)

### 4. Set up the database

```bash
pnpm db:generate  # Generate Prisma client
pnpm db:push      # Push schema to database
pnpm db:seed      # Seed with sample data
```

### 5. Start development servers

```bash
pnpm dev
```

This starts:
- Web app: http://localhost:3000
- API: http://localhost:3001
- Prisma Studio: `pnpm db:studio` (http://localhost:5555)

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps |
| `pnpm lint` | Lint all packages |
| `pnpm test` | Run tests |
| `pnpm typecheck` | Type check all packages |
| `pnpm format` | Format code with Prettier |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:seed` | Seed database with sample data |

## API Endpoints

### Health
- `GET /health` - Health check
- `GET /health/ready` - Readiness check (includes DB)

### Appointments
- `GET /api/appointments` - List appointments (paginated)
- `GET /api/appointments/:id` - Get appointment
- `POST /api/appointments` - Create appointment
- `PATCH /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Delete appointment

### Clients
- `GET /api/clients` - List clients (paginated, searchable)
- `GET /api/clients/:id` - Get client with appointments
- `POST /api/clients` - Create client
- `PATCH /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

## Database Schema

### Models
- **User**: Admin and staff users
- **Client**: Customer records
- **Appointment**: Scheduled appointments
- **Setting**: Application settings

## Development

### Adding a new shadcn/ui component

Components are already set up in `apps/web/components/ui/`. To add more:

1. Create component in `apps/web/components/ui/`
2. Follow shadcn/ui patterns
3. Use `cn()` utility from `@/lib/utils`

### Database changes

1. Edit `packages/database/prisma/schema.prisma`
2. Run `pnpm db:migrate --name your_migration_name`
3. Update seed file if needed

## License

Private - All rights reserved
