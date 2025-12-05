# =============================================================================
# Terminverwaltung - Makefile
# =============================================================================
#
# Common commands for development and deployment
#
# Usage: make <target>
#
# =============================================================================

.PHONY: help install dev build start stop logs clean reset docker-build docker-up docker-down docker-logs db-migrate db-seed db-studio

# Default target
help:
	@echo "Terminverwaltung - Available Commands"
	@echo ""
	@echo "Development:"
	@echo "  make install      - Install dependencies"
	@echo "  make dev          - Start development servers (requires Docker services)"
	@echo "  make dev-services - Start Docker services (postgres, mailpit, redis)"
	@echo "  make build        - Build all packages"
	@echo "  make lint         - Run linter"
	@echo "  make typecheck    - Run TypeScript type checking"
	@echo ""
	@echo "Database:"
	@echo "  make db-migrate   - Run database migrations"
	@echo "  make db-seed      - Seed database with test data"
	@echo "  make db-studio    - Open Prisma Studio"
	@echo "  make db-reset     - Reset database (WARNING: deletes all data)"
	@echo ""
	@echo "Docker (Production):"
	@echo "  make docker-build - Build production Docker image"
	@echo "  make docker-up    - Start production container"
	@echo "  make docker-down  - Stop production container"
	@echo "  make docker-logs  - View container logs"
	@echo "  make docker-reset - Reset everything (WARNING: deletes all data)"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean        - Remove build artifacts"
	@echo "  make gen-secrets  - Generate secure secrets for .env"

# -----------------------------------------------------------------------------
# Development
# -----------------------------------------------------------------------------

install:
	pnpm install

dev: dev-services
	@sleep 2
	pnpm dev

dev-services:
	docker compose -f docker-compose.dev.yml up -d

dev-stop:
	docker compose -f docker-compose.dev.yml down

build:
	pnpm build

lint:
	pnpm lint

typecheck:
	pnpm typecheck

# -----------------------------------------------------------------------------
# Database
# -----------------------------------------------------------------------------

db-migrate:
	pnpm db:migrate

db-push:
	pnpm db:push

db-seed:
	pnpm db:seed

db-studio:
	pnpm db:studio

db-reset:
	@echo "WARNING: This will delete all data!"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	pnpm db:push --force-reset
	pnpm db:seed

# -----------------------------------------------------------------------------
# Docker (Production)
# -----------------------------------------------------------------------------

docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-restart:
	docker compose restart

docker-reset:
	@echo "WARNING: This will delete all data including the database!"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	docker compose down -v
	docker compose up -d --build

docker-shell:
	docker compose exec app /bin/bash

# -----------------------------------------------------------------------------
# Utilities
# -----------------------------------------------------------------------------

clean:
	rm -rf node_modules/.cache
	rm -rf apps/web/.next
	rm -rf apps/api/dist
	rm -rf .turbo

gen-secrets:
	@echo ""
	@echo "Add these to your .env file:"
	@echo ""
	@echo "NEXTAUTH_SECRET=\"$$(openssl rand -base64 32)\""
	@echo "CRON_SECRET=\"$$(openssl rand -hex 16)\""
	@echo "POSTGRES_PASSWORD=\"$$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9')\""
	@echo ""

# Setup for new developers
setup: install
	@if [ ! -f .env ]; then cp .env.example .env; echo "Created .env from .env.example"; fi
	@echo ""
	@echo "Next steps:"
	@echo "  1. Edit .env with your settings (run 'make gen-secrets' for secure values)"
	@echo "  2. Run 'make dev-services' to start Docker services"
	@echo "  3. Run 'make db-migrate' to set up the database"
	@echo "  4. Run 'make db-seed' to add test data"
	@echo "  5. Run 'make dev' to start development servers"
	@echo ""
