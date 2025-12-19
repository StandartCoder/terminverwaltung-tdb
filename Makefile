# =============================================================================
# Terminverwaltung - Makefile (Development Only)
# =============================================================================
#
# For production deployment, use the one-liner installer:
#   curl -sSL https://raw.githubusercontent.com/your-org/terminverwaltung/main/install.sh | sudo bash
#
# =============================================================================

.PHONY: help dev dev-services dev-stop build db-migrate db-seed db-studio setup clean clean-docker test typecheck lint

.DEFAULT_GOAL := help

help:
	@echo ""
	@echo "  Terminverwaltung - Development Commands"
	@echo "  ========================================"
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
	@echo "  Testing:"
	@echo "    make test           Run all tests"
	@echo "    make typecheck      Run TypeScript checks"
	@echo "    make lint           Run ESLint"
	@echo ""
	@echo "  Setup:"
	@echo "    make setup          First-time setup (install deps, create .env)"
	@echo "    make clean          Stop everything, delete data + node_modules"
	@echo "    make clean-docker   Stop Docker and delete volumes only"
	@echo ""
	@echo "  Production:"
	@echo "    See install.sh for one-liner production deployment"
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
# Testing
# =============================================================================

test:
	pnpm test

typecheck:
	pnpm typecheck

lint:
	pnpm lint

# =============================================================================
# Setup & Cleanup
# =============================================================================

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
	@echo "Removing node_modules and build artifacts..."
	@rm -rf node_modules apps/*/node_modules apps/*/.next apps/*/.turbo \
	        packages/*/node_modules packages/*/.turbo .turbo
	@echo ""
	@echo "Cleaned! Run 'make setup' to start fresh."

clean-docker:
	@docker compose -f docker-compose.dev.yml down -v --remove-orphans 2>/dev/null || true
	@echo "Stopped containers and removed volumes."
