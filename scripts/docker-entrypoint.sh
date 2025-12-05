#!/bin/bash
set -e

echo "=============================================="
echo "Terminverwaltung - Starting All-in-One Server"
echo "=============================================="

# Load environment from .env if mounted
if [ -f /app/.env ]; then
  echo "Loading environment from /app/.env..."
  set -a
  source /app/.env
  set +a
fi

# Set defaults
export POSTGRES_USER="${POSTGRES_USER:-postgres}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
export POSTGRES_DB="${POSTGRES_DB:-terminverwaltung}"
export DATABASE_URL="${DATABASE_URL:-postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}?schema=public}"
export PORT_WEB="${PORT_WEB:-3000}"
export PORT_API="${PORT_API:-3001}"
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:${PORT_API}}"
export CRON_SECRET="${CRON_SECRET:-$(openssl rand -hex 16)}"

# Export for child processes
export DATABASE_URL
export NODE_ENV=production

echo "Database URL: postgresql://${POSTGRES_USER}:***@localhost:5432/${POSTGRES_DB}"
echo "Web Port: ${PORT_WEB}"
echo "API Port: ${PORT_API}"

# Initialize PostgreSQL if needed
if [ ! -s /var/lib/postgresql/data/PG_VERSION ]; then
  echo "Initializing PostgreSQL database..."
  su-exec postgres initdb -D /var/lib/postgresql/data --auth=trust --encoding=UTF8
  
  # Configure PostgreSQL
  echo "host all all 0.0.0.0/0 md5" >> /var/lib/postgresql/data/pg_hba.conf
  echo "listen_addresses='*'" >> /var/lib/postgresql/data/postgresql.conf
fi

# Start PostgreSQL
echo "Starting PostgreSQL..."
su-exec postgres pg_ctl -D /var/lib/postgresql/data -l /var/log/supervisor/postgresql.log start -w

# Wait for PostgreSQL
until su-exec postgres pg_isready -q; do
  echo "Waiting for PostgreSQL..."
  sleep 1
done
echo "PostgreSQL is ready!"

# Create database and user if needed
su-exec postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '${POSTGRES_DB}'" | grep -q 1 || \
  su-exec postgres psql -c "CREATE DATABASE ${POSTGRES_DB};"

su-exec postgres psql -c "ALTER USER ${POSTGRES_USER} WITH PASSWORD '${POSTGRES_PASSWORD}';" 2>/dev/null || true

# Run Prisma migrations
echo "Running database migrations..."
cd /app/packages/database
npx prisma migrate deploy
cd /app

echo "Starting application services..."

# Start supervisor to manage all processes
exec supervisord -n -c /etc/supervisor/conf.d/supervisord.conf
