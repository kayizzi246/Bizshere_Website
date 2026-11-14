#!/bin/sh
# Container start: bring the database up to date, then run the server.
# This is why Coolify deploys never leave the database "behind" the code (the cause of the
# "This page didn't load" crashes on Netlify, where migrations never ran).
set -e

echo "→ Applying database migrations (prisma migrate deploy)…"
npx prisma migrate deploy

# Database-level checks and indexes (safe to run again on every start).
echo "→ Applying database constraints…"
npx prisma db execute --file prisma/sql/constraints.sql --schema prisma/schema.prisma || echo "  (constraints step skipped)"

echo "→ Starting Next.js…"
exec npm run start
