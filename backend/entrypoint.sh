#!/bin/sh
# Production entrypoint.
# Fails the deploy loudly if the DB schema and the model code are out of sync.
# That way Railway surfaces the problem instead of silently routing traffic to
# a container running new code against an old schema (which produces 504s).

set -e

echo "──────────────────────────────────────────────────────────────"
echo " [entrypoint] 1/4  Checking for unrecorded model changes"
echo "──────────────────────────────────────────────────────────────"
# --check exits 1 if makemigrations WOULD create a file. That means someone
# changed a model but forgot to run `python manage.py makemigrations` and
# commit the migration file. Abort the deploy so we don't ship broken schema.
if ! python manage.py makemigrations --check --dry-run; then
    echo ""
    echo "ERROR: Model changes detected with no migration file."
    echo "Run locally:  docker compose exec api python manage.py makemigrations"
    echo "Then commit the new migration file(s) and redeploy."
    exit 1
fi

echo "──────────────────────────────────────────────────────────────"
echo " [entrypoint] 2/4  Applying migrations"
echo "──────────────────────────────────────────────────────────────"
python manage.py migrate --noinput

echo "──────────────────────────────────────────────────────────────"
echo " [entrypoint] 3/4  Seeding platforms (only if empty)"
echo "──────────────────────────────────────────────────────────────"
# Only load the fixture on a fresh DB. Re-running it every deploy risks PK
# collisions with rows users have modified and will abort startup.
PLATFORM_COUNT=$(python manage.py shell -c "from apps.briefs.models import Platform; print(Platform.objects.count())" 2>/dev/null | tail -n 1)
if [ "$PLATFORM_COUNT" = "0" ]; then
    echo "Platform table empty — loading fixture."
    python manage.py loaddata platforms
else
    echo "Platform table has $PLATFORM_COUNT rows — skipping fixture."
fi

echo "──────────────────────────────────────────────────────────────"
echo " [entrypoint] 4/4  Collecting static files"
echo "──────────────────────────────────────────────────────────────"
python manage.py collectstatic --noinput

echo "──────────────────────────────────────────────────────────────"
echo " [entrypoint] Booting gunicorn on port ${PORT:-8000}"
echo "──────────────────────────────────────────────────────────────"
exec gunicorn config.wsgi:application \
    --bind "0.0.0.0:${PORT:-8000}" \
    --workers 4 \
    --worker-class gevent \
    --worker-connections 100 \
    --timeout 120
