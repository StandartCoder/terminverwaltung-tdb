# =============================================================================
# Terminverwaltung - Makefile (Development Only)
# =============================================================================
#
# For production deployment, use the one-liner installer in README.md!
#
# =============================================================================

.PHONY: help dev dev-services dev-stop build db-migrate db-seed db-studio setup setup-env clean clean-docker test typecheck lint

.DEFAULT_GOAL := help

# Generate random strings for secrets
RANDOM_PASSWORD := $(shell openssl rand -hex 16 2>/dev/null || head -c 32 /dev/urandom | xxd -p | head -c 32)
RANDOM_SECRET := $(shell openssl rand -base64 48 2>/dev/null | tr -d '\n' || head -c 64 /dev/urandom | base64 | head -c 64)
RANDOM_SHORT := $(shell openssl rand -hex 16 2>/dev/null || head -c 32 /dev/urandom | xxd -p | head -c 32)

help:
	@echo ""
	@echo "  Terminverwaltung - Development Commands"
	@echo "  ========================================"
	@echo ""
	@echo "  Quick Start:"
	@echo "    make setup          First-time setup (generates .env with secure creds)"
	@echo "    make dev            Start everything (postgres, mailpit, app)"
	@echo ""
	@echo "  Development:"
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
	@echo "  Cleanup:"
	@echo "    make clean          Stop everything, delete data + node_modules"
	@echo "    make clean-docker   Stop Docker and delete volumes only"
	@echo ""

# =============================================================================
# Development
# =============================================================================

dev: setup-env dev-services
	@echo "Waiting for database..."
	@sleep 3
	@$(MAKE) db-migrate
	pnpm dev

dev-services: setup-env
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

test: setup-env
	pnpm test

typecheck:
	pnpm typecheck

lint:
	pnpm lint

# =============================================================================
# Setup & Cleanup
# =============================================================================

# Check if .env exists, create if not
setup-env:
	@if [ ! -f .env ]; then \
		echo "Generating .env with secure credentials..."; \
		DB_PASS=$$(openssl rand -hex 16); \
		JWT_SEC=$$(openssl rand -base64 48 | tr -d '\n'); \
		JWT_REF=$$(openssl rand -base64 48 | tr -d '\n'); \
		CRON_SEC=$$(openssl rand -hex 16); \
		echo "# Terminverwaltung - Auto-generated on $$(date)" > .env; \
		echo "# DO NOT COMMIT THIS FILE" >> .env; \
		echo "" >> .env; \
		echo "# Database" >> .env; \
		echo "DB_USER=terminverwaltung" >> .env; \
		echo "DB_PASSWORD=$$DB_PASS" >> .env; \
		echo "DB_NAME=terminverwaltung" >> .env; \
		echo "DB_HOST=localhost" >> .env; \
		echo "DB_PORT=5432" >> .env; \
		echo "DATABASE_URL=\"postgresql://terminverwaltung:$$DB_PASS@localhost:5432/terminverwaltung?schema=public\"" >> .env; \
		echo "" >> .env; \
		echo "# App URLs" >> .env; \
		echo "NEXT_PUBLIC_APP_URL=http://localhost:3000" >> .env; \
		echo "NEXT_PUBLIC_API_URL=http://localhost:3001" >> .env; \
		echo "CORS_ORIGIN=http://localhost:3000" >> .env; \
		echo "" >> .env; \
		echo "# Security (auto-generated)" >> .env; \
		echo "JWT_SECRET=$$JWT_SEC" >> .env; \
		echo "JWT_REFRESH_SECRET=$$JWT_REF" >> .env; \
		echo "CRON_SECRET=$$CRON_SEC" >> .env; \
		echo "" >> .env; \
		echo "# Email - Mailpit (dev)" >> .env; \
		echo "SMTP_HOST=localhost" >> .env; \
		echo "SMTP_PORT=1025" >> .env; \
		echo "SMTP_FROM=noreply@localhost" >> .env; \
		chmod 600 .env; \
		echo ""; \
		echo "  ✓ Generated .env with secure random credentials"; \
		echo ""; \
	fi

setup: setup-env
	@echo "Installing dependencies..."
	pnpm install
	@echo ""
	@echo "  ✓ Setup complete!"
	@echo ""
	@echo "  Next: run 'make dev' to start developing"
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
