#!/bin/bash
set -e

echo "=============================================="
echo "Terminverwaltung - Starting Application"
echo "=============================================="

# Load environment from .env if mounted
if [ -f /app/.env ]; then
  echo "Loading environment from /app/.env..."
  set -a
  source /app/.env
  set +a
fi

# Auto-generate secrets if not set
generate_secret() {
  openssl rand -base64 48 | tr -d '\n'
}

SECRETS_GENERATED=0

if [ -z "$JWT_SECRET" ]; then
  JWT_SECRET=$(generate_secret)
  echo "JWT_SECRET=\"$JWT_SECRET\"" >> /app/.env
  echo "Auto-generated JWT_SECRET"
  SECRETS_GENERATED=1
fi

if [ -z "$JWT_REFRESH_SECRET" ]; then
  JWT_REFRESH_SECRET=$(generate_secret)
  echo "JWT_REFRESH_SECRET=\"$JWT_REFRESH_SECRET\"" >> /app/.env
  echo "Auto-generated JWT_REFRESH_SECRET"
  SECRETS_GENERATED=1
fi

if [ -z "$CRON_SECRET" ]; then
  CRON_SECRET=$(openssl rand -hex 16)
  echo "CRON_SECRET=\"$CRON_SECRET\"" >> /app/.env
  echo "Auto-generated CRON_SECRET"
  SECRETS_GENERATED=1
fi

if [ $SECRETS_GENERATED -eq 1 ]; then
  echo "Secrets have been auto-generated and saved to /app/.env"
  echo "These secrets will persist across container restarts."
fi

export JWT_SECRET JWT_REFRESH_SECRET CRON_SECRET

# Parse DATABASE_URL to extract credentials
# Format: postgresql://user:password@host:port/database?schema=public
if [ -n "$DATABASE_URL" ]; then
  DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
  DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
  DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
  DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
else
  # Fallback for embedded mode (no external DATABASE_URL)
  DB_USER="postgres"
  DB_PASS="postgres"
  DB_HOST="localhost"
  DB_PORT="5432"
  DB_NAME="terminverwaltung"
  export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?schema=public"
fi

export NODE_ENV=production
export PORT_WEB="${PORT_WEB:-3000}"
export PORT_API="${PORT_API:-3001}"

echo "Database: $DB_NAME @ $DB_HOST:$DB_PORT (user: $DB_USER)"
echo "Web Port: $PORT_WEB"
echo "API Port: $PORT_API"

# Determine if we need embedded PostgreSQL or external
USE_EMBEDDED_POSTGRES=0

if [ "$DB_HOST" = "localhost" ] || [ "$DB_HOST" = "127.0.0.1" ]; then
  USE_EMBEDDED_POSTGRES=1
  echo "Using embedded PostgreSQL..."
  
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
else
  echo "Using external PostgreSQL at $DB_HOST:$DB_PORT..."
  
  # Wait for external PostgreSQL to be ready
  echo "Waiting for PostgreSQL..."
  until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -q 2>/dev/null; do
    sleep 1
  done
  echo "PostgreSQL is ready!"
fi

# Run Prisma migrations
echo "Running database migrations..."
cd /app/packages/database
prisma migrate deploy

# Seed database only on first run (check if teachers table has any rows)
# Prisma client is generated in /app/packages/database/node_modules
cd /app/packages/database

echo "Checking if database needs seeding..."
TEACHER_COUNT=$(node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  prisma.teacher.count()
    .then(c => { console.log(c); return prisma.\$disconnect(); })
    .catch(() => { console.log(0); return prisma.\$disconnect(); });
" 2>/dev/null | tail -1)

TEACHER_COUNT=${TEACHER_COUNT:-0}
echo "Found $TEACHER_COUNT teachers in database"

if [ "$TEACHER_COUNT" = "0" ] || [ -z "$TEACHER_COUNT" ]; then
  echo "Seeding database (first run)..."
  node <<'SEED_EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  // Pre-computed bcrypt hash for "admin123" with 12 rounds
  // Users must change password on first login (mustChangePassword: true)
  const ADMIN_PASSWORD_HASH = '$2b$12$NUNIpLl4bX/Rly9kA7juCOQYLyzQ2sP7PWsaM5TlOyxnl8aKffYRC';
  
  // Departments (upsert to be idempotent)
  const depts = [
    { name: 'Fachinformatiker/in', shortCode: 'IT', color: '#3B82F6' },
    { name: 'KFZ-Mechatroniker/in', shortCode: 'KFZ', color: '#EF4444' },
    { name: 'Elektrotechniker/in', shortCode: 'ET', color: '#10B981' },
    { name: 'Mediengestalter/in', shortCode: 'MG', color: '#F59E0B' },
    { name: 'Anlagenmechaniker/in', shortCode: 'AN', color: '#8B5CF6' },
    { name: 'Wasserbauer/in', shortCode: 'WB', color: '#1479b8' },
  ];
  for (const d of depts) {
    await prisma.department.upsert({
      where: { name: d.name },
      update: {},
      create: d,
    });
  }
  console.log('  Created/verified 6 departments');
  
  // Admin (upsert)
  await prisma.teacher.upsert({
    where: { email: 'admin@osz-teltow.de' },
    update: {},
    create: {
      email: 'admin@osz-teltow.de',
      passwordHash: ADMIN_PASSWORD_HASH,
      firstName: 'Admin',
      lastName: 'User',
      isAdmin: true,
      mustChangePassword: true,
    },
  });
  console.log('  Created/verified admin: admin@osz-teltow.de / admin123');
  
  // Settings (upsert)
  const settings = [
    { key: 'school_name', value: 'OSZ-Teltow', description: 'Name der Schule' },
    { key: 'school_email', value: 'info@osz-teltow.de', description: 'E-Mail der Schule' },
    { key: 'booking_enabled', value: 'true', description: 'Buchungen aktiviert' },
    { key: 'email_notifications', value: 'true', description: 'E-Mail Benachrichtigungen aktiv' },
    { key: 'slot_duration_minutes', value: '20', description: 'Standard Terminlänge in Minuten' },
    { key: 'large_company_threshold', value: '5', description: 'Ab dieser Azubi-Anzahl: Sondertermine' },
  ];
  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log('  Created/verified 6 settings');
  
  await prisma.$disconnect();
  console.log('Seeding completed!');
}

seed().catch(e => { console.error(e); process.exit(1); });
SEED_EOF
else
  echo "Database already seeded ($TEACHER_COUNT teachers found), skipping..."
fi

cd /app

echo "Starting application services..."
exec supervisord -n -c /etc/supervisor/conf.d/supervisord.conf
