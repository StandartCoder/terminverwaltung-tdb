#!/bin/bash
# Cron script for sending booking reminders
# Reads configuration from .env file in project root
#
# Usage:
#   ./scripts/cron-reminders.sh
#
# Crontab (every 15 minutes):
#   */15 * * * * /path/to/terminverwaltung-tdb/scripts/cron-reminders.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/.env"

# Load .env file if it exists
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

API_URL="${NEXT_PUBLIC_API_URL:-}"
CRON_SECRET="${CRON_SECRET:-}"

if [ -z "$API_URL" ]; then
  echo "Error: NEXT_PUBLIC_API_URL is not set in .env" >&2
  exit 1
fi

if [ -z "$CRON_SECRET" ]; then
  echo "Error: CRON_SECRET is not set in .env" >&2
  exit 1
fi

ENDPOINT="${API_URL}/api/cron/reminders"
LOG_FILE="${LOG_FILE:-${PROJECT_ROOT}/logs/cron-reminders.log}"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting reminder cron job..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
  -H "x-cron-secret: $CRON_SECRET" \
  -H "Content-Type: application/json" \
  --max-time 60)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  log "Success: $BODY"
elif [ "$HTTP_CODE" -eq 401 ]; then
  log "Error: Unauthorized - check CRON_SECRET"
  exit 1
else
  log "Error: HTTP $HTTP_CODE - $BODY"
  exit 1
fi
