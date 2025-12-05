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

# Parse DATABASE_URL to extract credentials for PostgreSQL init
# Format: postgresql://user:password@host:port/database?schema=public
if [ -n "$DATABASE_URL" ]; then
  DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
  DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
  DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
else
  DB_USER="postgres"
  DB_PASS="postgres"
  DB_NAME="terminverwaltung"
  export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?schema=public"
fi

export NODE_ENV=production
export PORT_WEB="${PORT_WEB:-3000}"
export PORT_API="${PORT_API:-3001}"

echo "Database: $DB_NAME (user: $DB_USER)"
echo "Web Port: $PORT_WEB"
echo "API Port: $PORT_API"

# Initialize PostgreSQL if needed
if [ ! -s /var/lib/postgresql/data/PG_VERSION ]; then
  echo "Initializing PostgreSQL database..."
  su-exec postgres initdb -D /var/lib/postgresql/data --auth=trust --encoding=UTF8
  
  echo "host all all 0.0.0.0/0 md5" >> /var/lib/postgresql/data/pg_hba.conf
  echo "listen_addresses='*'" >> /var/lib/postgresql/data/postgresql.conf
fi

# Start PostgreSQL
echo "Starting PostgreSQL..."
su-exec postgres pg_ctl -D /var/lib/postgresql/data -l /var/lib/postgresql/postgresql.log start -w

# Wait for PostgreSQL
until su-exec postgres pg_isready -q; do
  echo "Waiting for PostgreSQL..."
  sleep 1
done
echo "PostgreSQL is ready!"

# Create database and user
echo "Setting up database..."
su-exec postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname = '${DB_USER}'" | grep -q 1 || \
  su-exec postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}' SUPERUSER;"
su-exec postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1 || \
  su-exec postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
su-exec postgres psql -c "ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" 2>/dev/null || true
su-exec postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" 2>/dev/null || true

# Run Prisma migrations
echo "Running database migrations..."
cd /app/packages/database
prisma migrate deploy
cd /app

echo "Starting application services..."
exec supervisord -n -c /etc/supervisor/conf.d/supervisord.conf
