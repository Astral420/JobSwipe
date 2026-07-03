# Makefile for JobApp Monorepo

.PHONY: help setup install start stop logs clean migrate seed test lint

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)JobApp Monorepo Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Setup$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-20s$(NC) %s\n", $$1, $$2}'

setup: ## Initial setup - copies env files and installs dependencies
	@echo "$(BLUE)Setting up JobApp...$(NC)"
	cp .env.example .env
	cp frontend/web/.env.example frontend/web/.env.local
	cp frontend/mobile/.env.example frontend/mobile/.env
	@echo "$(GREEN)✓ Environment files created$(NC)"

install: ## Install dependencies for all projects
	@echo "$(BLUE)Installing dependencies...$(NC)"
	cd backend && composer install && cd ..
	cd frontend/web && npm install && cd ..
	cd frontend/mobile && npm install && cd ..
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

docker-up: ## Start Docker services (PostgreSQL, MongoDB, Redis, Laravel)
	@echo "$(BLUE)Starting Docker services...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ Services started$(NC)"
	@echo "PostgreSQL: localhost:5433"
	@echo "MongoDB: localhost:27017"
	@echo "Redis: localhost:6379"
	@echo "Laravel API: localhost:8000"
	@echo "Redis Commander: localhost:8081"
	@echo "Mongo Express: localhost:8082"

docker-down: ## Stop Docker services
	@echo "$(BLUE)Stopping Docker services...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ Services stopped$(NC)"

docker-logs: ## View Docker logs
	docker-compose logs -f

docker-clean: ## Clean Docker containers and volumes
	@echo "$(BLUE)Cleaning Docker...$(NC)"
	docker-compose down -v
	@echo "$(GREEN)✓ Docker cleaned$(NC)"

migrate: ## Run database migrations
	@echo "$(BLUE)Running migrations...$(NC)"
	cd backend && php artisan migrate && cd ..
	@echo "$(GREEN)✓ Migrations completed$(NC)"

migrate-fresh: ## Reset and run migrations
	@echo "$(BLUE)Resetting database...$(NC)"
	cd backend && php artisan migrate:refresh && cd ..
	@echo "$(GREEN)✓ Database reset$(NC)"

seed: ## Seed database with sample data
	@echo "$(BLUE)Seeding database...$(NC)"
	cd backend && php artisan db:seed && cd ..
	@echo "$(GREEN)✓ Database seeded$(NC)"

serve-backend: ## Start Laravel development server
	@echo "$(BLUE)Starting Laravel server...$(NC)"
	cd backend && php artisan serve

serve-web: ## Start Next.js development server
	@echo "$(BLUE)Starting web server...$(NC)"
	cd frontend/web && npm run dev

serve-mobile: ## Start React Native development
	@echo "$(BLUE)Starting mobile dev...$(NC)"
	cd frontend/mobile && npm start

lint-backend: ## Lint PHP code
	@echo "$(BLUE)Linting PHP code...$(NC)"
	cd backend && php vendor/bin/pint --test && cd ..
	@echo "$(GREEN)✓ PHP code is clean$(NC)"

lint-web: ## Lint web code
	@echo "$(BLUE)Linting web code...$(NC)"
	cd frontend/web && npm run lint && cd ..
	@echo "$(GREEN)✓ Web code is clean$(NC)"

lint-mobile: ## Lint mobile code
	@echo "$(BLUE)Linting mobile code...$(NC)"
	cd frontend/mobile && npm run lint && cd ..
	@echo "$(GREEN)✓ Mobile code is clean$(NC)"

format-backend: ## Format PHP code
	@echo "$(BLUE)Formatting PHP code...$(NC)"
	cd backend && php vendor/bin/pint && cd ..
	@echo "$(GREEN)✓ PHP formatted$(NC)"

format-web: ## Format web code
	@echo "$(BLUE)Formatting web code...$(NC)"
	cd frontend/web && npm run lint -- --fix && cd ..
	@echo "$(GREEN)✓ Web formatted$(NC)"

format-mobile: ## Format mobile code
	@echo "$(BLUE)Formatting mobile code...$(NC)"
	cd frontend/mobile && npm run lint -- --fix && cd ..
	@echo "$(GREEN)✓ Mobile formatted$(NC)"

test-backend: ## Run backend tests
	@echo "$(BLUE)Running backend tests...$(NC)"
	cd backend && php artisan test && cd ..

test-backend-feature-real: ## Run backend feature tests with real PostgreSQL/MongoDB/Redis
	@echo "$(BLUE)Running backend feature tests with real backends...$(NC)"
	docker compose exec -T laravel sh -lc "cd /var/www/html && ./vendor/bin/phpunit -c phpunit.feature.xml"

test-web: ## Run web tests
	@echo "$(BLUE)Running web tests...$(NC)"
	cd frontend/web && npm test && cd ..

test-mobile: ## Run mobile tests
	@echo "$(BLUE)Running mobile tests...$(NC)"
	cd frontend/mobile && npm test && cd ..

test: test-backend test-web test-mobile ## Run all tests

tinker: ## Open Laravel Tinker REPL
	cd backend && php artisan tinker && cd ..

psql: ## Connect to PostgreSQL database
	docker-compose exec postgres psql -U postgres -d jobapp

mongosh: ## Connect to MongoDB
	docker-compose exec mongodb mongosh -u root -p password

redis-cli: ## Connect to Redis
	docker-compose exec redis redis-cli -a password

clean: ## Clean all node_modules and build artifacts
	@echo "$(BLUE)Cleaning...$(NC)"
	rm -rf backend/vendor
	rm -rf frontend/web/node_modules frontend/web/.next
	rm -rf frontend/mobile/node_modules
	@echo "$(GREEN)✓ Cleaned$(NC)"

install-all: setup install docker-up migrate ## Complete setup (env, dependencies, docker, migrations)
	@echo "$(GREEN)✓ JobApp is ready!$(NC)"
	@echo ""
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Start backend:  make serve-backend"
	@echo "  2. Start web:      make serve-web"
	@echo "  3. Start mobile:   make serve-mobile"

.DEFAULT_GOAL := help
