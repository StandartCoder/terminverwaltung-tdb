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

# Prune to production dependencies only
RUN pnpm prune --prod

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

WORKDIR /app

# Copy Next.js standalone (includes its own node_modules for web)
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

# Copy API dist and its package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

# Copy built packages
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/validators/dist ./packages/validators/dist
COPY --from=builder /app/packages/validators/package.json ./packages/validators/package.json
COPY --from=builder /app/packages/auth/dist ./packages/auth/dist
COPY --from=builder /app/packages/auth/package.json ./packages/auth/package.json
COPY --from=builder /app/packages/email/dist ./packages/email/dist
COPY --from=builder /app/packages/email/package.json ./packages/email/package.json

# Copy production node_modules (after prune)
COPY --from=builder /app/node_modules ./node_modules

# Copy Prisma schema and migrations for runtime
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

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
