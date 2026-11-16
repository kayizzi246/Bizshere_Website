#!/bin/sh
# Container start: bring the database up to date, then run the server.
# This is why Railway/Coolify deploys never leave the database "behind" the code (the cause of
# the "This page didn't load" crashes on Netlify, where migrations never ran).
set -e

# ── Check the variables we cannot start without ──
# The image deliberately does NOT contain .env (see .dockerignore), so every one of these has to
# come from the host's environment variables (Railway → service → Variables). Without this check
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
  echo "  Set them on the service (Railway → your service → Variables), then redeploy." >&2
  echo "  DATABASE_URL should reference the database service, e.g.  \${{Postgres.DATABASE_URL}}" >&2
  echo "  NEXTAUTH_URL is the site's public https address, not http://localhost:3000." >&2
  echo "  Do not wrap values in quotes — quotes are .env syntax and become part of the value." >&2
  echo "  Full list: docs/deploy-railway.md" >&2
  exit 1
fi

# A pooled connection string (PgBouncer) can refuse the advisory lock that `migrate deploy` takes.
case "$DATABASE_URL" in
  *pgbouncer=true*|*pooler*)
    echo "! DATABASE_URL looks pooled; if migrations fail, use the direct/unpooled URL." >&2
    ;;
esac

echo "→ Applying database migrations (prisma migrate deploy)…"
npx prisma migrate deploy

# Database-level checks and indexes (safe to run again on every start).
echo "→ Applying database constraints…"
npx prisma db execute --file prisma/sql/constraints.sql --schema prisma/schema.prisma || echo "  (constraints step skipped)"

echo "→ Starting Next.js…"
exec npm run start
