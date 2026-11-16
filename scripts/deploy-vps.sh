#!/bin/sh
# Bring the whole site up on a VPS: Postgres and the app, as one Docker Compose stack.
#
#   sh scripts/deploy-vps.sh
#
# Safe to run again at any time — it is how you deploy an update too. Nothing here is destructive:
# the database lives in a named volume that survives rebuilds, and the script never drops it.
#
# This deliberately does not use Coolify. Coolify puts an application and a database on separate
# Docker networks unless told otherwise, which is why the app could not reach the database. Here
# both are services in one stack, so they share a network by construction and cannot drift apart.
set -e

cd "$(dirname "$0")/.."
ENV_FILE=.env.production
COMPOSE="docker compose -f docker-compose.prod.yml --env-file $ENV_FILE"

# ── Checks before we touch anything ──
if ! command -v docker >/dev/null 2>&1; then
  echo "✗ Docker is not installed. Install it first:  curl -fsSL https://get.docker.com | sh" >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "✗ The Docker Compose plugin is missing. On Debian/Ubuntu:" >&2
  echo "    apt-get update && apt-get install -y docker-compose-plugin" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "✗ $ENV_FILE does not exist." >&2
  echo "" >&2
  echo "  Create it from the example, then fill in the blanks:" >&2
  echo "    cp .env.production.example $ENV_FILE && nano $ENV_FILE" >&2
  echo "" >&2
  echo "  The four it cannot start without are POSTGRES_PASSWORD, NEXTAUTH_URL," >&2
  echo "  NEXTAUTH_SECRET and ADMIN_LOGIN_KEY. Generate a secret with:" >&2
  echo "    openssl rand -base64 32" >&2
  exit 1
fi

# Fail here with a readable message rather than inside the container.
missing=""
for var in POSTGRES_PASSWORD NEXTAUTH_URL NEXTAUTH_SECRET ADMIN_LOGIN_KEY; do
  value=$(grep -E "^${var}=" "$ENV_FILE" | head -1 | cut -d= -f2-)
  if [ -z "$value" ]; then
    missing="$missing $var"
  fi
done
if [ -n "$missing" ]; then
  echo "✗ These are empty in $ENV_FILE:$missing" >&2
  echo "  Fill them in and run this again." >&2
  exit 1
fi

# ── Build and start ──
echo "→ Building the image (a few minutes the first time)…"
$COMPOSE build

echo "→ Starting Postgres and the app…"
# Compose waits for the database's health check before starting the app, and the app's own
# entrypoint then waits again and applies migrations. No manual database step is needed.
$COMPOSE up -d

echo ""
echo "→ Waiting for the site to answer…"
port=$(grep -E "^APP_PORT=" "$ENV_FILE" | head -1 | cut -d= -f2-)
port=${port:-3000}
attempt=1
until curl -fsS -o /dev/null "http://127.0.0.1:${port}/robots.txt" 2>/dev/null; do
  if [ "$attempt" -ge 60 ]; then
    echo "✗ Still not answering after 2 minutes. The logs will say why:" >&2
    echo "    $COMPOSE logs --tail 50 app" >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 2
done

echo "  the site is up on port ${port}."
echo ""
echo "Done. Next:"
echo "  • First time only — create the admin user and reference data:"
echo "      $COMPOSE exec app npm run db:seed:production"
echo "  • Watch the logs:    $COMPOSE logs -f app"
echo "  • Deploy an update:  git pull && sh scripts/deploy-vps.sh"
