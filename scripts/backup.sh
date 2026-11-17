#!/bin/sh
# Back up the database and the uploaded files.
#
#   sh scripts/backup.sh                     # compose stack (docker-compose.prod.yml)
#   DB_CONTAINER=my-postgres sh scripts/backup.sh     # a Coolify-managed database
#   BACKUP_PASSPHRASE=… sh scripts/backup.sh          # encrypt before it leaves the server
#   BACKUP_DIR=/mnt/backups sh scripts/backup.sh
#
# Both halves matter. The database holds the listings, members and payments; the uploads volume
# holds every photo and document behind them. A backup of one without the other restores a site
# full of broken images, or a set of files nothing points at.
#
# Run it from cron — see docs/security-and-backups.md. A backup that only runs when someone
# remembers is not a backup.
set -e

cd "$(dirname "$0")/.."
ENV_FILE=.env.production
DIR=${BACKUP_DIR:-./backups}
KEEP=${BACKUP_KEEP:-14}
STAMP=$(date +%Y%m%d-%H%M%S)

# ── How to reach the database and the app ──
# Two shapes are supported. The compose stack (docker-compose.prod.yml) is the default. A
# Coolify-managed Postgres is not part of that stack, so give its container name instead —
# `docker ps` shows it. The app container is optional either way: without it the uploads are
# skipped rather than the whole run failing.
if [ -n "${DB_CONTAINER:-}" ]; then
  DB_EXEC="docker exec -i $DB_CONTAINER"
  APP_EXEC=${APP_CONTAINER:+docker exec -i $APP_CONTAINER}
  DB_USER=${POSTGRES_USER:-postgres}
  DB_NAME=${POSTGRES_DB:-postgres}
else
  COMPOSE="docker compose -f docker-compose.prod.yml --env-file $ENV_FILE"
  if [ ! -f "$ENV_FILE" ]; then
    echo "✗ $ENV_FILE not found. Run this beside docker-compose.prod.yml, or set DB_CONTAINER" >&2
    echo "  to back up a Coolify-managed database instead." >&2
    exit 1
  fi
  DB_EXEC="$COMPOSE exec -T db"
  APP_EXEC="$COMPOSE exec -T app"
  DB_USER=$(grep -E "^POSTGRES_USER=" "$ENV_FILE" | head -1 | cut -d= -f2-); DB_USER=${DB_USER:-bizsphere}
  DB_NAME=$(grep -E "^POSTGRES_DB=" "$ENV_FILE" | head -1 | cut -d= -f2-); DB_NAME=${DB_NAME:-bizsphere}
fi

mkdir -p "$DIR"
DUMP="$DIR/db-$STAMP.dump"

# ── Database ──
# -Fc is the custom format: compressed, and pg_restore can read it selectively.
echo "→ Dumping the database…"
if ! $DB_EXEC pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc --no-owner --no-privileges > "$DUMP"; then
  echo "✗ pg_dump failed. Is the database running, and are POSTGRES_USER/POSTGRES_DB right?" >&2
  rm -f "$DUMP"
  exit 1
fi

# A dump of an empty or broken database still produces a small file, so check the size rather than
# trusting the exit code. A real dump of this schema is tens of KB at minimum.
size=$(wc -c < "$DUMP")
if [ "$size" -lt 10000 ]; then
  echo "✗ The dump is only $size bytes — that is too small to be real. Keeping it for inspection," >&2
  echo "  but treat this run as failed." >&2
  exit 1
fi

# ── Uploaded files ──
if [ -n "$APP_EXEC" ]; then
  echo "→ Archiving the uploads…"
  $APP_EXEC tar -czf - -C /data/uploads . > "$DIR/uploads-$STAMP.tar.gz" 2>/dev/null || {
    echo "! Could not archive /data/uploads. If no volume is mounted there, uploads are not being" >&2
    echo "  kept at all — see docs/security-and-backups.md." >&2
    rm -f "$DIR/uploads-$STAMP.tar.gz"
  }
else
  echo "! No app container given (APP_CONTAINER), so the uploaded files are NOT in this backup."
  echo "  The database alone restores a site with broken images."
fi

# ── Encryption ──
# Anything that leaves this server should be encrypted: the dump holds names, phone numbers and
# payment records. The passphrase must live somewhere other than the server, or this is theatre.
if [ -n "${BACKUP_PASSPHRASE:-}" ]; then
  echo "→ Encrypting…"
  for f in "$DUMP" "$DIR/uploads-$STAMP.tar.gz"; do
    [ -f "$f" ] || continue
    printf '%s' "$BACKUP_PASSPHRASE" | gpg --batch --yes --quiet --passphrase-fd 0 \
      --symmetric --cipher-algo AES256 -o "$f.gpg" "$f"
    rm -f "$f"
  done
fi

# ── Rotate ──
# Delete the oldest beyond KEEP, counting each kind separately so one missing uploads archive does
# not shift the database's window.
echo "→ Keeping the newest $KEEP of each…"
for kind in db uploads; do
  ls -1t "$DIR"/$kind-* 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
    rm -f "$old"
  done
done

echo ""
echo "Done:"
ls -lh "$DIR"/db-$STAMP.* "$DIR"/uploads-$STAMP.* 2>/dev/null | awk '{print "  "$9"  "$5}'
echo ""
echo "These are on the same machine as the site, so they do not survive losing it."
echo "Copy them somewhere else — see docs/security-and-backups.md."
