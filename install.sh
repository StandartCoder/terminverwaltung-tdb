#!/bin/bash
# =============================================================================
# Terminverwaltung - One-Line Installer
# =============================================================================
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/StandartCoder/terminverwaltung-tdb/main/install.sh | sudo bash
#
# =============================================================================

set -e

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

INSTALL_DIR="/opt/terminverwaltung"
REPO_URL="https://raw.githubusercontent.com/StandartCoder/terminverwaltung-tdb/main"
IMAGE_NAME="ghcr.io/standartcoder/terminverwaltung-tdb:latest"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

generate_password() {
  openssl rand -hex 24
}

generate_secret() {
  openssl rand -base64 48 | tr -d '\n'
}

generate_short_secret() {
  openssl rand -hex 16
}

check_root() {
  if [ "$EUID" -ne 0 ]; then
    error "Please run as root: curl -sSL ... | sudo bash"
  fi
}

# -----------------------------------------------------------------------------
# Docker Installation
# -----------------------------------------------------------------------------

install_docker() {
  if command -v docker &> /dev/null; then
    success "Docker already installed"
    return 0
  fi

  info "Installing Docker..."

  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
  else
    error "Cannot detect OS. Please install Docker manually: https://docs.docker.com/engine/install/"
  fi

  case $OS in
    ubuntu|debian)
      apt-get update -qq
      apt-get install -y -qq ca-certificates curl gnupg
      install -m 0755 -d /etc/apt/keyrings
      curl -fsSL https://download.docker.com/linux/$OS/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
      chmod a+r /etc/apt/keyrings/docker.gpg
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
      apt-get update -qq
      apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
      ;;
    centos|rhel|fedora)
      dnf install -y -q dnf-plugins-core || yum install -y -q yum-utils
      dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo 2>/dev/null || yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
      dnf install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin || yum install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin
      ;;
    alpine)
      apk add --no-cache docker docker-compose
      ;;
    *)
      error "Unsupported OS: $OS. Please install Docker manually: https://docs.docker.com/engine/install/"
      ;;
  esac

  systemctl start docker
  systemctl enable docker
  success "Docker installed"
}

# -----------------------------------------------------------------------------
# Interactive Prompts
# -----------------------------------------------------------------------------

prompt_config() {
  echo ""
  echo -e "${BLUE}================================================${NC}"
  echo -e "${BLUE}   Terminverwaltung - Installation${NC}"
  echo -e "${BLUE}================================================${NC}"
  echo ""

  # Domain
  if [ -z "$DOMAIN" ]; then
    read -p "Domain (leave empty for localhost): " DOMAIN
    DOMAIN=${DOMAIN:-localhost}
  fi

  # Determine protocol
  if [ "$DOMAIN" = "localhost" ]; then
    PROTOCOL="http"
    APP_URL="http://localhost:3000"
    API_URL="http://localhost:3001"
  else
    PROTOCOL="https"
    APP_URL="https://$DOMAIN"
    API_URL="https://$DOMAIN"
  fi

  # Admin email
  if [ -z "$NO_PROMPT" ]; then
    echo ""
    read -p "Admin email [admin@example.com]: " ADMIN_EMAIL
    ADMIN_EMAIL=${ADMIN_EMAIL:-admin@example.com}
  else
    ADMIN_EMAIL=${ADMIN_EMAIL:-admin@example.com}
  fi

  # SMTP settings
  if [ -z "$NO_PROMPT" ]; then
    echo ""
    read -p "Configure email (SMTP)? [y/N]: " CONFIGURE_SMTP
    if [[ "$CONFIGURE_SMTP" =~ ^[Yy]$ ]]; then
      read -p "SMTP Host: " SMTP_HOST
      read -p "SMTP Port [587]: " SMTP_PORT
      SMTP_PORT=${SMTP_PORT:-587}
      read -p "SMTP User: " SMTP_USER
      read -s -p "SMTP Password: " SMTP_PASSWORD
      echo ""
      read -p "From Email: " SMTP_FROM
    fi
  fi

  echo ""
}

# -----------------------------------------------------------------------------
# Installation
# -----------------------------------------------------------------------------

create_install_dir() {
  info "Creating installation directory..."
  mkdir -p "$INSTALL_DIR"
  cd "$INSTALL_DIR"
  success "Created $INSTALL_DIR"
}

generate_credentials() {
  info "Generating secure credentials..."
  
  # Database credentials
  DB_USER="terminverwaltung"
  DB_PASSWORD=$(generate_password)
  DB_NAME="terminverwaltung"
  
  # JWT secrets
  JWT_SECRET=$(generate_secret)
  JWT_REFRESH_SECRET=$(generate_secret)
  
  # Other secrets
  CRON_SECRET=$(generate_short_secret)
  ADMIN_PASSWORD=$(generate_short_secret)
  
  success "Generated secure random credentials"
}

create_compose_file() {
  info "Creating docker-compose.yml..."
  cat > docker-compose.yml << COMPOSE_EOF
# Terminverwaltung - Production Docker Compose
# Generated by install.sh on $(date)

services:
  postgres:
    image: postgres:16-alpine
    container_name: terminverwaltung-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${DB_USER}']
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    image: ${IMAGE_NAME}
    container_name: terminverwaltung-app
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - '3000:3000'
      - '3001:3001'
    env_file:
      - .env
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3001/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

volumes:
  postgres_data:
    name: terminverwaltung_postgres
COMPOSE_EOF
  success "Created docker-compose.yml"
}

create_env_file() {
  info "Creating .env with secure credentials..."

  cat > .env << ENV_EOF
# =============================================================================
# Terminverwaltung Configuration
# Generated on $(date)
# =============================================================================
# KEEP THIS FILE SECURE - contains passwords and secrets!
# =============================================================================

# Database (auto-generated - do not share!)
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
DB_HOST=postgres
DB_PORT=5432
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}?schema=public"

# App URLs
NEXT_PUBLIC_APP_URL="${APP_URL}"
NEXT_PUBLIC_API_URL="${API_URL}"
CORS_ORIGIN="${APP_URL}"

# Security (auto-generated - do not share!)
JWT_SECRET="${JWT_SECRET}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}"
CRON_SECRET="${CRON_SECRET}"

# Initial Admin Account
ADMIN_EMAIL="${ADMIN_EMAIL}"
ADMIN_PASSWORD="${ADMIN_PASSWORD}"

# Email (SMTP)
SMTP_HOST="${SMTP_HOST:-}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_USER="${SMTP_USER:-}"
SMTP_PASSWORD="${SMTP_PASSWORD:-}"
SMTP_FROM="${SMTP_FROM:-}"
ENV_EOF

  chmod 600 .env
  success "Created .env with secure credentials"
}

save_credentials() {
  info "Saving credentials to credentials.txt..."
  
  cat > credentials.txt << CREDS_EOF
=============================================================================
Terminverwaltung - Installation Credentials
Generated on $(date)
=============================================================================

KEEP THIS FILE SECURE! Delete after noting down the credentials.

=============================================================================
ADMIN LOGIN
=============================================================================
URL:      ${APP_URL}
Email:    ${ADMIN_EMAIL}
Password: ${ADMIN_PASSWORD}

=============================================================================
DATABASE
=============================================================================
Host:     postgres (internal) / localhost:5432 (if exposed)
User:     ${DB_USER}
Password: ${DB_PASSWORD}
Database: ${DB_NAME}

=============================================================================
MANAGEMENT COMMANDS
=============================================================================
terminverwaltung start     - Start the application
terminverwaltung stop      - Stop the application
terminverwaltung restart   - Restart the application
terminverwaltung update    - Pull latest version and restart
terminverwaltung logs      - View application logs
terminverwaltung backup    - Create database backup
terminverwaltung status    - Show container status

=============================================================================
FILES
=============================================================================
Config:      ${INSTALL_DIR}/.env
Compose:     ${INSTALL_DIR}/docker-compose.yml
This file:   ${INSTALL_DIR}/credentials.txt

=============================================================================
CREDS_EOF

  chmod 600 credentials.txt
  success "Saved credentials to credentials.txt"
}

create_management_script() {
  info "Creating management script..."
  cat > terminverwaltung << 'SCRIPT_EOF'
#!/bin/bash
# Terminverwaltung Management Script

INSTALL_DIR="/opt/terminverwaltung"
cd "$INSTALL_DIR"

case "$1" in
  start)
    docker compose up -d
    echo "Terminverwaltung started"
    ;;
  stop)
    docker compose down
    echo "Terminverwaltung stopped"
    ;;
  restart)
    docker compose restart
    echo "Terminverwaltung restarted"
    ;;
  update)
    echo "Pulling latest images..."
    docker compose pull
    docker compose up -d
    echo "Terminverwaltung updated"
    ;;
  logs)
    docker compose logs -f "${2:-app}"
    ;;
  status)
    docker compose ps
    ;;
  backup)
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    echo "Creating backup..."
    docker compose exec -T postgres pg_dump -U terminverwaltung terminverwaltung > "$BACKUP_FILE"
    if [ $? -eq 0 ]; then
      echo "Backup saved to: $INSTALL_DIR/$BACKUP_FILE"
    else
      echo "Backup failed!"
      exit 1
    fi
    ;;
  restore)
    if [ -z "$2" ]; then
      echo "Usage: terminverwaltung restore <backup_file.sql>"
      exit 1
    fi
    if [ ! -f "$2" ]; then
      echo "Backup file not found: $2"
      exit 1
    fi
    echo "Restoring from $2..."
    docker compose exec -T postgres psql -U terminverwaltung terminverwaltung < "$2"
    echo "Restore complete"
    ;;
  shell)
    docker compose exec app sh
    ;;
  db)
    docker compose exec postgres psql -U terminverwaltung terminverwaltung
    ;;
  uninstall)
    echo ""
    echo "WARNING: This will delete ALL data including:"
    echo "  - Database with all bookings"
    echo "  - Configuration files"
    echo "  - Docker volumes"
    echo ""
    read -p "Type 'DELETE' to confirm: " confirm
    if [ "$confirm" = "DELETE" ]; then
      docker compose down -v
      rm -rf "$INSTALL_DIR"
      rm -f /usr/local/bin/terminverwaltung
      echo "Terminverwaltung uninstalled"
    else
      echo "Uninstall cancelled"
    fi
    ;;
  *)
    echo ""
    echo "Terminverwaltung Management"
    echo ""
    echo "Usage: terminverwaltung <command>"
    echo ""
    echo "Commands:"
    echo "  start       Start the application"
    echo "  stop        Stop the application"
    echo "  restart     Restart the application"
    echo "  update      Pull latest version and restart"
    echo "  logs [svc]  View logs (default: app, or: postgres)"
    echo "  status      Show container status"
    echo "  backup      Create database backup"
    echo "  restore     Restore from backup file"
    echo "  shell       Open shell in app container"
    echo "  db          Open PostgreSQL shell"
    echo "  uninstall   Remove everything (DESTRUCTIVE!)"
    echo ""
    ;;
esac
SCRIPT_EOF

  chmod +x terminverwaltung
  ln -sf "$INSTALL_DIR/terminverwaltung" /usr/local/bin/terminverwaltung
  success "Created 'terminverwaltung' command"
}

start_services() {
  info "Starting Terminverwaltung..."
  docker compose pull
  docker compose up -d

  echo ""
  info "Waiting for services to be ready..."
  
  for i in {1..60}; do
    if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
      success "Services are ready!"
      return 0
    fi
    sleep 2
    echo -n "."
  done
  echo ""
  warn "Services may still be starting. Check with: terminverwaltung logs"
}

print_success() {
  echo ""
  echo -e "${GREEN}================================================${NC}"
  echo -e "${GREEN}   Installation Complete!${NC}"
  echo -e "${GREEN}================================================${NC}"
  echo ""
  echo -e "  ${BLUE}Application:${NC}  $APP_URL"
  echo -e "  ${BLUE}API:${NC}          $API_URL/api"
  echo ""
  echo -e "  ${BLUE}Admin Login:${NC}"
  echo -e "    Email:    ${ADMIN_EMAIL}"
  echo -e "    Password: ${ADMIN_PASSWORD}"
  echo ""
  echo -e "  ${YELLOW}>>> SAVE THESE CREDENTIALS! <<<${NC}"
  echo -e "  ${YELLOW}>>> CHANGE THE PASSWORD AFTER FIRST LOGIN! <<<${NC}"
  echo ""
  echo -e "  Credentials also saved to: ${INSTALL_DIR}/credentials.txt"
  echo ""
  echo -e "  ${BLUE}Management:${NC}"
  echo "    terminverwaltung start|stop|restart|logs|status|update|backup"
  echo ""
  echo -e "  ${BLUE}Config:${NC} $INSTALL_DIR/.env"
  echo ""
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

main() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --domain)
        DOMAIN="$2"
        shift 2
        ;;
      --admin-email)
        ADMIN_EMAIL="$2"
        shift 2
        ;;
      --no-prompt)
        NO_PROMPT=1
        shift
        ;;
      *)
        shift
        ;;
    esac
  done

  echo ""
  echo -e "${BLUE}Terminverwaltung Installer${NC}"
  echo ""

  check_root
  install_docker
  prompt_config
  create_install_dir
  generate_credentials
  create_compose_file
  create_env_file
  save_credentials
  create_management_script
  start_services
  print_success
}

main "$@"
