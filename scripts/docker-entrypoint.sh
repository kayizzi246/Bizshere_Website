#!/bin/sh
# Container start: bring the database up to date, then run the server.
# This is why container deploys never leave the database "behind" the code (the cause of
# the "This page didn't load" crashes on Netlify, where migrations never ran).
set -e

# ── Check the variables we cannot start without ──
# The image deliberately does NOT contain .env (see .dockerignore), so every one of these has to
# come from the host (Railway → Variables, Coolify → Environment Variables). Without this check
# a missing DATABASE_URL surfaces as a 40-line Prisma P1012 stack trace in a restart loop, which
# looks like a code fault but never is.
missing=""
for var in DATABASE_URL NEXTAUTH_URL NEXTAUTH_SECRET; do
  eval "value=\${$var:-}"
  if [ -z "$value" ]; then
    missing="$missing $var"
  fi
done

if [ -n "$missing" ]; then
  echo "✗ Cannot start: missing required environment variable(s):$missing" >&2
  echo "" >&2
  echo "  Set them on the host (Railway → Variables, Coolify → Environment Variables)," >&2
  echo "  then redeploy." >&2
  echo "  DATABASE_URL must use the database's INTERNAL host, not localhost (inside this" >&2
  echo "  container localhost is the container itself)." >&2
  echo "  NEXTAUTH_URL is the site's public https address, not http://localhost:3000." >&2
  echo "  Build-only variables never reach the running container — check it applies at runtime." >&2
  echo "  Guides: docs/deploy-railway.md, docs/deploy-coolify.md" >&2
  exit 1
fi

# A pooled connection string (PgBouncer) can refuse the advisory lock that `migrate deploy` takes.
case "$DATABASE_URL" in
  *pgbouncer=true*|*pooler*)
    echo "! DATABASE_URL looks pooled; if migrations fail, use the direct/unpooled URL." >&2
    ;;
esac

# ── Wait for the database to accept connections ──
# A database container next to this one is usually still starting when the app boots, and a
# database behind a managed host can be briefly unreachable during a restart. Without this the
# first `migrate deploy` fails on P1001 and the whole container restarts, which on most hosts
# turns a few seconds of waiting into a crash loop.
echo "→ Waiting for the database…"
attempt=1
until npx prisma db execute --stdin --schema prisma/schema.prisma >/dev/null 2>&1 <<'PROBE'
SELECT 1;
PROBE
do
  if [ "$attempt" -ge 30 ]; then
    echo "✗ Database unreachable after 30 attempts (about 60s)." >&2
    echo "  Host in DATABASE_URL must be reachable from inside this container:" >&2
    echo "  a sibling container is its service name (e.g. 'db'), never localhost." >&2
    echo "  A managed database on another network also needs outbound TCP 5432 to be open." >&2
    exit 1
  fi
  printf '  not ready yet (%s/30)\n' "$attempt"
  attempt=$((attempt + 1))
  sleep 2
done
echo "  database is up."

# Schema changes run as the database OWNER; the site itself runs as a role that can only read and
# write rows (prisma/sql/harden.sql). Set MIGRATION_DATABASE_URL to the owner's connection string
# to get that separation. Without it both use DATABASE_URL, exactly as before.
MIGRATE_URL=${MIGRATION_DATABASE_URL:-$DATABASE_URL}
if [ -n "${MIGRATION_DATABASE_URL:-}" ]; then
  echo "  (schema changes use MIGRATION_DATABASE_URL; the site runs as the restricted role)"
fi

echo "→ Applying database migrations (prisma migrate deploy)…"
DATABASE_URL="$MIGRATE_URL" npx prisma migrate deploy

# Database-level checks and indexes (safe to run again on every start). DDL, so it is the owner's
# job too.
echo "→ Applying database constraints…"
DATABASE_URL="$MIGRATE_URL" npx prisma db execute --file prisma/sql/constraints.sql --schema prisma/schema.prisma || echo "  (constraints step skipped)"

echo "→ Starting Next.js…"
exec npm run start
