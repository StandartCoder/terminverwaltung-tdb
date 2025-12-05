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

# Seed database only on first run (check if teachers table has any rows)
# Prisma client is in the deployed API's node_modules
PRISMA_PATH="/app/api-prod/node_modules/@terminverwaltung/database/node_modules/.prisma/client"

echo "Checking if database needs seeding..."
TEACHER_COUNT=$(node -e "
  const { PrismaClient } = require('${PRISMA_PATH}');
  const prisma = new PrismaClient();
  prisma.teacher.count()
    .then(c => { console.log(c); return prisma.\$disconnect(); })
    .catch(() => { console.log(0); return prisma.\$disconnect(); });
" 2>/dev/null | tail -1)

TEACHER_COUNT=${TEACHER_COUNT:-0}
echo "Found $TEACHER_COUNT teachers in database"

if [ "$TEACHER_COUNT" = "0" ] || [ -z "$TEACHER_COUNT" ]; then
  echo "Seeding database (first run)..."
  node <<SEED_EOF
const { PrismaClient } = require('${PRISMA_PATH}');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function seed() {
  const hash = (p) => crypto.createHash('sha256').update(p).digest('hex');
  
  // Departments
  const depts = [
    { name: 'Fachinformatiker/in', shortCode: 'IT', color: '#3B82F6' },
    { name: 'KFZ-Mechatroniker/in', shortCode: 'KFZ', color: '#EF4444' },
    { name: 'Elektrotechniker/in', shortCode: 'ET', color: '#10B981' },
    { name: 'Mediengestalter/in', shortCode: 'MG', color: '#F59E0B' },
    { name: 'Anlagenmechaniker/in', shortCode: 'AN', color: '#8B5CF6' },
    { name: 'Wasserbauer/in', shortCode: 'WB', color: '#1479b8' },
  ];
  for (const d of depts) {
    await prisma.department.create({ data: d });
  }
  console.log('  Created 6 departments');
  
  // Admin
  await prisma.teacher.create({
    data: {
      email: 'admin@osz-teltow.de',
      passwordHash: hash('admin123'),
      firstName: 'Admin',
      lastName: 'User',
      isAdmin: true,
      mustChangePassword: true,
    },
  });
  console.log('  Created admin: admin@osz-teltow.de / admin123');
  
  // Settings
  const settings = [
    { key: 'school_name', value: 'OSZ-Teltow', description: 'Name der Schule' },
    { key: 'school_email', value: 'info@osz-teltow.de', description: 'E-Mail der Schule' },
    { key: 'booking_enabled', value: 'true', description: 'Buchungen aktiviert' },
    { key: 'email_notifications', value: 'true', description: 'E-Mail Benachrichtigungen aktiv' },
    { key: 'slot_duration_minutes', value: '20', description: 'Standard Terminlänge in Minuten' },
    { key: 'large_company_threshold', value: '5', description: 'Ab dieser Azubi-Anzahl: Sondertermine' },
  ];
  for (const s of settings) {
    await prisma.setting.create({ data: s });
  }
  console.log('  Created 6 settings');
  
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
