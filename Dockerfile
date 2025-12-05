# =============================================================================
# Terminverwaltung - All-in-One Docker Image
# Includes: PostgreSQL, API, Web, Cron
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Base with pnpm
# -----------------------------------------------------------------------------
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

# -----------------------------------------------------------------------------
# Stage 2: Install dependencies
# -----------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/validators/package.json ./packages/validators/
COPY packages/auth/package.json ./packages/auth/
COPY packages/email/package.json ./packages/email/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/

RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 3: Build application
# -----------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app

# Copy all from deps stage (includes node_modules)
COPY --from=deps /app ./

# Copy source code
COPY apps ./apps
COPY packages ./packages
COPY turbo.json ./

# Generate Prisma client and build everything
RUN pnpm db:generate
RUN pnpm build

# Deploy only production deps to a clean directory
RUN pnpm deploy --filter=@terminverwaltung/api --prod /prod/api

# Copy prisma schema to deployed API and generate client there
COPY packages/database/prisma /prod/api/node_modules/@terminverwaltung/database/prisma
RUN cd /prod/api/node_modules/@terminverwaltung/database && npx prisma@6.0.1 generate

# -----------------------------------------------------------------------------
# Stage 4: Production runtime (all-in-one)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runtime

# Install runtime dependencies
RUN apk add --no-cache \
    postgresql16 \
    postgresql16-contrib \
    supervisor \
    curl \
    bash \
    openssl \
    su-exec \
    && mkdir -p /var/lib/postgresql/data /run/postgresql /var/log/supervisor /app/logs \
    && chown -R postgres:postgres /var/lib/postgresql /run/postgresql /var/log/supervisor

# Install Prisma CLI v6 globally for migrations
RUN npm install -g prisma@6.0.1

WORKDIR /app

# Copy Next.js standalone (includes its own node_modules for web)
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

# Copy deployed API (includes node_modules with correct versions)
COPY --from=builder /prod/api ./api-prod

# Copy Prisma schema and migrations for runtime
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# Generate Prisma client in a known location for seeding
RUN cd /app/packages/database && npm install @prisma/client@6.0.1 && prisma generate

# Copy scripts and configuration
COPY scripts/docker-entrypoint.sh /app/docker-entrypoint.sh
COPY scripts/cron-reminders.sh /app/scripts/cron-reminders.sh
COPY scripts/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

RUN chmod +x /app/docker-entrypoint.sh /app/scripts/cron-reminders.sh

# Expose ports
EXPOSE 3000 3001 5432

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/ && curl -f http://localhost:3001/api/health || exit 1

# Data volume
VOLUME ["/var/lib/postgresql/data", "/app/logs"]

ENTRYPOINT ["/app/docker-entrypoint.sh"]
