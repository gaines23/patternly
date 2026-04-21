# ── Base: shared system deps ───────────────────────────────────────────────────
FROM python:3.12-slim AS base

RUN apt-get update && apt-get install -y \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# ── Development: all deps + hot reload via volume mount ────────────────────────
FROM base AS development

COPY requirements.txt requirements-dev.txt ./
RUN pip install --upgrade pip \
    && pip install -r requirements-dev.txt

COPY . .

EXPOSE 8000
# CMD is provided by docker-compose.yml (python manage.py runserver)

# ── Production: prod deps only + gunicorn ─────────────────────────────────────
FROM base AS production

ARG CACHE_BUST=1

COPY requirements.txt ./
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

COPY . .

EXPOSE 8000
RUN chmod +x /app/entrypoint.sh
CMD ["/app/entrypoint.sh"]
