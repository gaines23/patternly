# Patternly

Workflow Intelligence Platform — AI-powered ClickUp workflow documentation, recommendation, and prediction engine.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, React Query, React Router |
| Backend | Django 5, Django REST Framework, SimpleJWT |
| Database | PostgreSQL 16 + pgvector |
| Proxy | Nginx |
| Container | Docker Compose |

---

## Local Setup

### Prerequisites

- Docker Desktop (Mac/Windows) or Docker Engine + Compose (Linux)
- Make (optional but recommended)
- Node 20+ (only if running frontend outside Docker)

### 1. Clone and configure

```bash
git clone <your-repo-url> patternly
cd patternly
cp .env.example .env
```

Edit `.env` and set a real `SECRET_KEY`. Generate one with:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 2. Start everything

```bash
make up
# or without make:
docker compose up -d
```

First run pulls images and builds — takes 2-3 minutes.

### 3. Run migrations and create admin

```bash
make migrate
make superuser
# or:
docker compose exec api python manage.py migrate
docker compose exec api python manage.py createsuperuser
```

### 4. Open the app

| URL | What |
|---|---|
| http://localhost | React frontend |
| http://localhost/api/health/ | API health check |
| http://localhost/admin/ | Django admin |
| http://localhost:5173 | Vite direct (hot reload) |
| localhost:5432 | PostgreSQL (user: patternly) |

---

## Common Commands

```bash
make up          # Start stack
make down        # Stop stack
make logs        # Stream all logs
make migrate     # Run migrations
make superuser   # Create admin user
make test        # Run pytest
make test-cov    # Pytest with coverage
make shell       # Django shell_plus
make db-shell    # psql session
make lint        # flake8
make format      # black + isort
make restart     # Rebuild and restart
```

---

## Project Structure

```
patternly/
├── docker-compose.yml
├── Makefile
├── .env.example
├── nginx/
│   └── nginx.conf              # Reverse proxy config
├── scripts/
│   └── init_db.sql             # pgvector + uuid-ossp extensions
├── backend/
│   ├── Dockerfile
│   ├── manage.py
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── pytest.ini
│   ├── conftest.py             # Shared fixtures
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py         # Shared settings
│   │   │   ├── local.py        # Dev overrides
│   │   │   └── production.py   # Prod settings
│   │   ├── urls.py
│   │   ├── api_router.py       # Central v1 router
│   │   └── wsgi.py
│   └── apps/
│       ├── users/              # Custom auth user + JWT
│       ├── briefs/             # 6-layer case file system
│       └── workflows/          # Phase 2: RAG knowledge base
└── frontend/
    ├── Dockerfile
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx             # Router
        ├── main.jsx            # Entry + React Query
        ├── index.css
        ├── api/
        │   └── client.js       # Axios + JWT interceptors
        ├── hooks/
        │   ├── useAuth.jsx     # Auth context
        │   ├── useCaseFiles.js # React Query hooks
        │   └── useUsers.js
        ├── utils/
        │   └── transforms.js   # Form ↔ API payload translation
        ├── components/
        │   ├── CaseFileForm.jsx   # Full 6-step intake form
        │   └── layout/
        │       ├── AppLayout.jsx
        │       └── ProtectedRoute.jsx
        └── pages/
            ├── auth/           # Login, Register
            ├── dashboard/      # Stats + recent list
            └── casefile/       # List, New, Detail, Edit
```

---

## API Endpoints

```
POST   /api/v1/auth/token/              Login → JWT
POST   /api/v1/auth/token/refresh/      Refresh access token
POST   /api/v1/users/register/          Register
GET    /api/v1/users/me/                Current user profile
PATCH  /api/v1/users/me/               Update profile
POST   /api/v1/users/me/password/       Change password

GET    /api/v1/briefs/                  List case files (filterable)
POST   /api/v1/briefs/                  Create case file (all 6 layers)
GET    /api/v1/briefs/<id>/             Case file detail
PUT    /api/v1/briefs/<id>/             Update case file
DELETE /api/v1/briefs/<id>/             Delete case file
GET    /api/v1/briefs/stats/            Dashboard stats
GET    /api/v1/briefs/roadblocks/warnings/?tools=Slack,HubSpot
                                        Proactive warnings for a tool stack
```

### Filtering

```
GET /api/v1/briefs/?industry=SaaS+%2F+Software+Product
GET /api/v1/briefs/?tool=Slack
GET /api/v1/briefs/?workflow_type=Sprint+Planning
GET /api/v1/briefs/?min_satisfaction=4
GET /api/v1/briefs/?search=hubspot
```

---

## Running Tests

```bash
# All tests
make test

# With coverage
make test-cov

# Single file
docker compose exec api pytest apps/briefs/tests/test_api.py -v

# Single test
docker compose exec api pytest apps/briefs/tests/test_api.py::TestCaseFileCreateAPI::test_create_full_case_file -v
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `POSTGRES_DB` | Database name | `patternly` |
| `POSTGRES_USER` | DB user | `patternly` |
| `POSTGRES_PASSWORD` | DB password | *(set this)* |
| `SECRET_KEY` | Django secret key | *(generate + set)* |
| `DEBUG` | Debug mode | `True` |
| `ALLOWED_HOSTS` | Comma-separated hosts | `localhost,127.0.0.1` |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origins | `http://localhost:3000,...` |
| `ANTHROPIC_API_KEY` | For Phase 2 AI brief generation | *(optional now)* |
| `VITE_API_URL` | Frontend API base URL | `http://localhost/api` |

---

## Phase Roadmap

**Phase 1 (current)** — Manual documentation engine
- 6-layer case file builder ✅
- PostgreSQL + pgvector ready ✅
- JWT auth ✅
- Roadblock warning system ✅

**Phase 2** — AI recommendation engine
- RAG retrieval over case file knowledge base
- Claude API integration for workflow brief generation
- Proactive warning injection into recommendations
- Embedding pipeline via pgvector

**Phase 3** — ClickUp API deployment
- Automated workspace creation from approved briefs
- Webhook-based outcome tracking
- Live workflow health monitoring
