# ── Flowpath Developer Commands ───────────────────────────────────────────────
# Usage: make <command>

.PHONY: help up down build logs shell db-shell migrate migrations superuser \
        test test-cov lint format reset seed

COMPOSE = docker compose
API     = $(COMPOSE) exec api
FE      = $(COMPOSE) exec frontend

# ── Default ───────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  Flowpath — available commands"
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
	$(COMPOSE) exec db psql -U flowpath -d flowpath

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
	$(API) python manage.py seed_flowpath

seed-clear:
	$(API) python manage.py seed_flowpath --clear

embed:
	$(API) python manage.py build_embeddings

embed-rebuild:
	$(API) python manage.py build_embeddings --rebuild

embed-dry:
	$(API) python manage.py build_embeddings --dry-run
