#!/bin/sh
# Load a pg_dump archive into the database of the running compose stack.
#
#   sh scripts/restore-dump.sh bizsphere.dump
#
# For moving the data off a database the server cannot reach (Prisma Postgres, a managed host
# behind a firewall) onto the Postgres that now runs beside the app. Take the dump somewhere with
# a route to the old database — see docs/restore-old-data.md — copy the file here, then run this.
#
# It refuses to run if the database already holds content, so it cannot quietly overwrite work
# entered since the site came back. Clearing it first is then a deliberate act, not an accident.
set -e

DUMP=${1:-}
ENV_FILE=.env.production
COMPOSE="docker compose -f docker-compose.prod.yml --env-file $ENV_FILE"

cd "$(dirname "$0")/.."

if [ -z "$DUMP" ] || [ ! -f "$DUMP" ]; then
  echo "Usage: sh scripts/restore-dump.sh <file.dump>" >&2
  echo "  The dump must be pg_dump's custom format (pg_dump -Fc)." >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "✗ $ENV_FILE not found. Run this on the server, beside docker-compose.prod.yml." >&2
  exit 1
fi

DB_USER=$(grep -E "^POSTGRES_USER=" "$ENV_FILE" | head -1 | cut -d= -f2-); DB_USER=${DB_USER:-bizsphere}
DB_NAME=$(grep -E "^POSTGRES_DB=" "$ENV_FILE" | head -1 | cut -d= -f2-); DB_NAME=${DB_NAME:-bizsphere}

if ! $COMPOSE ps db 2>/dev/null | grep -q "Up\|running"; then
  echo "✗ The database container is not running. Start the stack first:" >&2
  echo "    sh scripts/deploy-vps.sh" >&2
  exit 1
fi

# ── Refuse to overwrite real content ──
# A fresh database has only what the seed created. If users, content or payments exist, someone has
# been working in it, and restoring on top would duplicate rows or fail on unique constraints.
echo "→ Checking whether the database already holds data…"
counts=$($COMPOSE exec -T db psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT COALESCE((SELECT count(*) FROM \"ContentItem\"),0) + COALESCE((SELECT count(*) FROM \"Payment\"),0);" 2>/dev/null || echo "0")
counts=$(echo "$counts" | tr -d '[:space:]')

if [ "$counts" != "0" ] && [ -n "$counts" ]; then
  echo "✗ The database already holds $counts content items and payments." >&2
  echo "  Restoring on top would duplicate or collide with them." >&2
  echo "" >&2
  echo "  If you are certain you want the dump's version instead, empty it first:" >&2
  echo "    $COMPOSE exec db psql -U $DB_USER -d $DB_NAME -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'" >&2
  echo "  then run this again. That erases everything entered since the site came back." >&2
  exit 1
fi

echo "→ Copying the dump into the database container…"
$COMPOSE cp "$DUMP" db:/tmp/restore.dump

echo "→ Restoring…"
# --clean --if-exists so the seed's rows are replaced rather than collided with. Ownership and
# privileges are skipped: the roles from the old host do not exist here.
$COMPOSE exec -T db pg_restore -U "$DB_USER" -d "$DB_NAME" \
  --clean --if-exists --no-owner --no-privileges /tmp/restore.dump || {
    echo "! pg_restore reported errors. Some are normal (dropping objects that were not there)." >&2
    echo "  Check the site before deciding anything failed." >&2
  }

$COMPOSE exec -T db rm -f /tmp/restore.dump || true

echo "→ Making sure the schema matches the code…"
$COMPOSE exec -T app npx prisma migrate deploy

echo ""
echo "Done. Check the site, then confirm your admin sign-in still works."
echo "If the restored data came with its own admin user, your seeded one may now be gone."
