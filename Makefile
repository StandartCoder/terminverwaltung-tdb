# =============================================================================
# Terminverwaltung - Makefile
# =============================================================================

.PHONY: help dev dev-services dev-stop build docker-up docker-down docker-logs \
        docker-shell db-migrate db-seed db-studio setup gen-secrets clean clean-docker

# Default target
.DEFAULT_GOAL := help

help:
	@echo ""
	@echo "  Terminverwaltung"
	@echo "  ================"
	@echo ""
	@echo "  Development:"
	@echo "    make dev            Start dev servers (auto-starts postgres/mailpit)"
	@echo "    make dev-services   Start only Docker services"
	@echo "    make dev-stop       Stop dev Docker services"
	@echo "    make build          Build all packages"
	@echo ""
	@echo "  Database:"
	@echo "    make db-migrate     Run migrations"
	@echo "    make db-seed        Seed test data"
	@echo "    make db-studio      Open Prisma Studio"
	@echo ""
	@echo "  Docker (Production):"
	@echo "    make docker-up      Build and start container"
	@echo "    make docker-down    Stop container"
	@echo "    make docker-logs    View logs"
	@echo "    make docker-shell   Shell into container"
	@echo ""
	@echo "  Utilities:"
	@echo "    make setup          First-time setup (install deps, create .env)"
	@echo "    make gen-secrets    Generate secrets for .env"
	@echo "    make clean          Stop everything, delete data + node_modules"
	@echo "    make clean-docker   Stop Docker and delete volumes only"
	@echo ""

# =============================================================================
# Development
# =============================================================================

dev: dev-services
	@echo "Waiting for services..."
	@sleep 2
	pnpm dev

dev-services:
	docker compose -f docker-compose.dev.yml up -d

dev-stop:
	docker compose -f docker-compose.dev.yml down

build:
	pnpm build

# =============================================================================
# Database
# =============================================================================

db-migrate:
	pnpm db:migrate

db-push:
	pnpm db:push

db-seed:
	pnpm db:seed

db-studio:
	pnpm db:studio

# =============================================================================
# Docker (Production)
# =============================================================================

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-shell:
	docker compose exec app /bin/bash

# =============================================================================
# Utilities
# =============================================================================

gen-secrets:
	@echo ""
	@echo "Add these to your .env file:"
	@echo ""
	@echo "NEXTAUTH_SECRET=\"$$(openssl rand -base64 32)\""
	@echo "CRON_SECRET=\"$$(openssl rand -hex 16)\""
	@echo ""

setup:
	@echo "Installing dependencies..."
	pnpm install
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env from .env.example"; \
	else \
		echo ".env already exists"; \
	fi
	@echo ""
	@echo "Done! Next steps:"
	@echo "  1. Edit .env with your settings"
	@echo "  2. Run: make dev"
	@echo ""

clean:
	@echo "Stopping Docker containers..."
	@docker compose -f docker-compose.dev.yml down -v --remove-orphans 2>/dev/null || true
	@docker compose down -v --remove-orphans 2>/dev/null || true
	@echo "Removing node_modules and build artifacts..."
	@rm -rf node_modules apps/*/node_modules apps/*/.next apps/*/.turbo \
	        packages/*/node_modules packages/*/.turbo .turbo
	@echo ""
	@echo "Cleaned! Run 'make setup' to start fresh."

clean-docker:
	@docker compose -f docker-compose.dev.yml down -v --remove-orphans 2>/dev/null || true
	@docker compose down -v --remove-orphans 2>/dev/null || true
	@echo "Stopped containers and removed volumes."
