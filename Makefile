# =============================================================================
# Terminverwaltung - Makefile
# =============================================================================

.PHONY: help dev dev-services build docker-up docker-down docker-logs db-migrate db-seed

help:
	@echo "Development:"
	@echo "  make dev          - Start dev servers (auto-starts postgres/mailpit)"
	@echo "  make dev-services - Start only Docker services"
	@echo "  make build        - Build all packages"
	@echo ""
	@echo "Database:"
	@echo "  make db-migrate   - Run migrations"
	@echo "  make db-seed      - Seed test data"
	@echo "  make db-studio    - Open Prisma Studio"
	@echo ""
	@echo "Docker (Production):"
	@echo "  make docker-up    - Build and start container"
	@echo "  make docker-down  - Stop container"
	@echo "  make docker-logs  - View logs"
	@echo ""
	@echo "Setup:"
	@echo "  make setup        - First-time setup"
	@echo "  make gen-secrets  - Generate secrets for .env"

# Development
dev: dev-services
	@sleep 2
	pnpm dev

dev-services:
	docker compose -f docker-compose.dev.yml up -d

dev-stop:
	docker compose -f docker-compose.dev.yml down

build:
	pnpm build

# Database
db-migrate:
	pnpm db:migrate

db-seed:
	pnpm db:seed

db-studio:
	pnpm db:studio

# Docker Production
docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-shell:
	docker compose exec app /bin/bash

# Utilities
gen-secrets:
	@echo "NEXTAUTH_SECRET=\"$$(openssl rand -base64 32)\""
	@echo "CRON_SECRET=\"$$(openssl rand -hex 16)\""

setup:
	pnpm install
	@if [ ! -f .env ]; then cp .env.example .env; echo "Created .env"; fi
	@echo "Done. Edit .env, then run: make dev"
