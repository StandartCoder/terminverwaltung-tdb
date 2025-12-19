#!/bin/bash
# =============================================================================
# Terminverwaltung - One-Line Installer
# =============================================================================
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/your-org/terminverwaltung/main/install.sh | bash
#
# Or with options:
#   curl -sSL ... | bash -s -- --domain termine.schule.de --no-prompt
#
# =============================================================================

set -e

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

INSTALL_DIR="/opt/terminverwaltung"
REPO_URL="https://raw.githubusercontent.com/your-org/terminverwaltung/main"
IMAGE_NAME="ghcr.io/your-org/terminverwaltung:latest"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

check_root() {
  if [ "$EUID" -ne 0 ]; then
    error "Please run as root: curl -sSL ... | sudo bash"
  fi
}

generate_secret() {
  openssl rand -base64 48 | tr -d '\n'
}

generate_short_secret() {
  openssl rand -hex 16
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

  # Detect OS
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

create_compose_file() {
  info "Creating docker-compose.yml..."
  cat > docker-compose.yml << 'COMPOSE_EOF'
# Terminverwaltung - Production Docker Compose
# Generated by install.sh

services:
  app:
    image: ghcr.io/your-org/terminverwaltung:latest
    container_name: terminverwaltung
    restart: unless-stopped
    ports:
      - '3000:3000'
      - '3001:3001'
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - app_logs:/app/logs
    env_file:
      - .env
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

volumes:
  postgres_data:
    name: terminverwaltung_postgres
  app_logs:
    name: terminverwaltung_logs
COMPOSE_EOF
  success "Created docker-compose.yml"
}

create_env_file() {
  info "Creating .env with auto-generated secrets..."

  # Generate secrets
  JWT_SECRET=$(generate_secret)
  JWT_REFRESH_SECRET=$(generate_secret)
  CRON_SECRET=$(generate_short_secret)

  cat > .env << ENV_EOF
# =============================================================================
# Terminverwaltung Configuration
# Generated on $(date)
# =============================================================================

# App URLs
NEXT_PUBLIC_APP_URL="${APP_URL}"
NEXT_PUBLIC_API_URL="${API_URL}"
CORS_ORIGIN="${APP_URL}"

# Database (internal - don't change)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/terminverwaltung?schema=public"

# Security (auto-generated - don't change)
JWT_SECRET="${JWT_SECRET}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}"
CRON_SECRET="${CRON_SECRET}"

# Email (SMTP)
SMTP_HOST="${SMTP_HOST:-}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_USER="${SMTP_USER:-}"
SMTP_PASSWORD="${SMTP_PASSWORD:-}"
SMTP_FROM="${SMTP_FROM:-}"
ENV_EOF

  chmod 600 .env
  success "Created .env with secure secrets"
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
    docker compose pull
    docker compose up -d
    echo "Terminverwaltung updated"
    ;;
  logs)
    docker compose logs -f
    ;;
  status)
    docker compose ps
    ;;
  backup)
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    docker compose exec -T app su-exec postgres pg_dump terminverwaltung > "$BACKUP_FILE"
    echo "Backup saved to: $INSTALL_DIR/$BACKUP_FILE"
    ;;
  uninstall)
    read -p "This will delete all data. Are you sure? [y/N]: " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
      docker compose down -v
      rm -rf "$INSTALL_DIR"
      rm -f /usr/local/bin/terminverwaltung
      echo "Terminverwaltung uninstalled"
    fi
    ;;
  *)
    echo "Terminverwaltung Management"
    echo ""
    echo "Usage: terminverwaltung <command>"
    echo ""
    echo "Commands:"
    echo "  start      Start the application"
    echo "  stop       Stop the application"
    echo "  restart    Restart the application"
    echo "  update     Pull latest image and restart"
    echo "  logs       View logs (Ctrl+C to exit)"
    echo "  status     Show container status"
    echo "  backup     Create database backup"
    echo "  uninstall  Remove everything"
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
  docker compose up -d

  echo ""
  info "Waiting for services to be ready..."
  
  # Wait for health check
  for i in {1..60}; do
    if curl -s -f http://localhost:3000/ > /dev/null 2>&1; then
      break
    fi
    sleep 2
    echo -n "."
  done
  echo ""
}

print_success() {
  echo ""
  echo -e "${GREEN}================================================${NC}"
  echo -e "${GREEN}   Installation Complete!${NC}"
  echo -e "${GREEN}================================================${NC}"
  echo ""
  echo -e "  ${BLUE}Web:${NC}   $APP_URL"
  echo -e "  ${BLUE}API:${NC}   $API_URL/api"
  echo ""
  echo -e "  ${BLUE}Login:${NC}"
  echo -e "    Email:    admin@osz-teltow.de"
  echo -e "    Password: admin123"
  echo ""
  echo -e "  ${YELLOW}CHANGE THE ADMIN PASSWORD IMMEDIATELY!${NC}"
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
  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      --domain)
        DOMAIN="$2"
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
  create_compose_file
  create_env_file
  create_management_script
  start_services
  print_success
}

main "$@"
