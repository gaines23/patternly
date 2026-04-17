# ── Patternly Developer Commands ───────────────────────────────────────────────
# Usage: make <command>

.PHONY: help up down build logs shell db-shell migrate migrations superuser \
        test test-cov lint format reset seed \
        prod-up prod-down prod-build prod-logs prod-migrate prod-shell

COMPOSE      = docker compose
COMPOSE_PROD = docker compose -f docker-compose.prod.yml --env-file .env.prod
API          = $(COMPOSE) exec api
API_PROD     = $(COMPOSE_PROD) exec api
FE           = $(COMPOSE) exec frontend

# ── Default ───────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  Patternly — available commands"
	@echo ""
	@echo "  Stack"
	@echo "    make up          Start all services (detached)"
	@echo "    make up-logs     Start all services with streaming logs"
	@echo "    make down        Stop all services"
	@echo "    make build       Rebuild all images"
	@echo "    make logs        Stream logs from all services"
	@echo "    make restart     Rebuild and restart everything"
	@echo ""
	@echo "  Database"
	@echo "    make migrate     Run Django migrations"
	@echo "    make migrations  Create new migrations"
	@echo "    make superuser   Create a Django superuser"
	@echo "    make db-shell    Open psql in the db container"
	@echo "    make reset-db    ⚠️  Drop and recreate the database"
	@echo ""
	@echo "  Dev"
	@echo "    make shell       Django shell_plus"
	@echo "    make test        Run pytest"
	@echo "    make test-cov    Run pytest with coverage report"
	@echo "    make lint        Run flake8"
	@echo "    make format      Run black + isort"
	@echo "    make seed        Load seed data (if fixtures exist)"
	@echo ""
	@echo "  Production (requires .env.prod)"
	@echo "    make prod-build  Build production images"
	@echo "    make prod-up     Start production stack"
	@echo "    make prod-down   Stop production stack"
	@echo "    make prod-logs   Stream production logs"
	@echo "    make prod-shell  Django shell in running prod api container"
	@echo ""

# ── Stack ─────────────────────────────────────────────────────────────────────
up:
	$(COMPOSE) up -d

up-logs:
	$(COMPOSE) up

down:
	$(COMPOSE) down

build:
	$(COMPOSE) build

logs:
	$(COMPOSE) logs -f

restart:
	$(COMPOSE) down && $(COMPOSE) build && $(COMPOSE) up -d

# ── Database ──────────────────────────────────────────────────────────────────
migrate:
	$(API) python manage.py migrate

migrations:
	$(API) python manage.py makemigrations

superuser:
	$(API) python manage.py createsuperuser

db-shell:
	$(COMPOSE) exec db psql -U patternly -d patternly

reset-db:
	@echo "⚠️  This will DELETE all data. Press Ctrl+C to cancel."
	@sleep 3
	$(COMPOSE) down -v
	$(COMPOSE) up -d db
	@sleep 3
	$(COMPOSE) up -d api
	$(API) python manage.py migrate

# ── Dev tools ─────────────────────────────────────────────────────────────────
shell:
	$(API) python manage.py shell_plus

test:
	$(API) pytest apps/ -v

test-cov:
	$(API) pytest apps/ --cov=apps --cov-report=term-missing --cov-report=html

lint:
	$(API) flake8 apps/ config/ --max-line-length=120 --exclude=migrations

format:
	$(API) black apps/ config/ --line-length=120
	$(API) isort apps/ config/

seed:
	$(API) python manage.py loaddata fixtures/seed.json

# ── Frontend ──────────────────────────────────────────────────────────────────
fe-install:
	$(FE) npm install

fe-build:
	$(FE) npm run build

fe-lint:
	$(FE) npm run lint

# ── AI / Data ─────────────────────────────────────────────────────────────────
seed:
	$(API) python manage.py seed_patternly

seed-clear:
	$(API) python manage.py seed_patternly --clear

embed:
	$(API) python manage.py build_embeddings

embed-rebuild:
	$(API) python manage.py build_embeddings --rebuild

embed-dry:
	$(API) python manage.py build_embeddings --dry-run

# ── Production ────────────────────────────────────────────────────────────────
prod-build:
	$(COMPOSE_PROD) build

prod-up:
	$(COMPOSE_PROD) up -d

prod-down:
	$(COMPOSE_PROD) down

prod-logs:
	$(COMPOSE_PROD) logs -f

prod-shell:
	$(API_PROD) python manage.py shell
