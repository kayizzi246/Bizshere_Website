#!/bin/sh
# Back up the database and the uploaded files.
#
#   sh scripts/backup.sh              # write a backup into ./backups
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
COMPOSE="docker compose -f docker-compose.prod.yml --env-file $ENV_FILE"
DIR=${BACKUP_DIR:-./backups}
KEEP=${BACKUP_KEEP:-14}
STAMP=$(date +%Y%m%d-%H%M%S)

if [ ! -f "$ENV_FILE" ]; then
  echo "✗ $ENV_FILE not found. Run this beside docker-compose.prod.yml." >&2
  exit 1
fi

DB_USER=$(grep -E "^POSTGRES_USER=" "$ENV_FILE" | head -1 | cut -d= -f2-); DB_USER=${DB_USER:-bizsphere}
DB_NAME=$(grep -E "^POSTGRES_DB=" "$ENV_FILE" | head -1 | cut -d= -f2-); DB_NAME=${DB_NAME:-bizsphere}

mkdir -p "$DIR"

# ── Database ──
# -Fc is the custom format: compressed, and pg_restore can read it selectively.
echo "→ Dumping the database…"
if ! $COMPOSE exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc --no-owner --no-privileges > "$DIR/db-$STAMP.dump"; then
  echo "✗ pg_dump failed. Is the stack running?  $COMPOSE ps" >&2
  rm -f "$DIR/db-$STAMP.dump"
  exit 1
fi

# A dump of an empty or broken database still produces a small file, so check the size rather than
# trusting the exit code. A real dump of this schema is tens of KB at minimum.
size=$(wc -c < "$DIR/db-$STAMP.dump")
if [ "$size" -lt 10000 ]; then
  echo "✗ The dump is only $size bytes — that is too small to be real. Keeping it for inspection," >&2
  echo "  but treat this run as failed." >&2
  exit 1
fi

# ── Uploaded files ──
echo "→ Archiving the uploads…"
$COMPOSE exec -T app tar -czf - -C /data/uploads . > "$DIR/uploads-$STAMP.tar.gz" 2>/dev/null || {
  echo "! Could not archive /data/uploads. If no volume is mounted there, uploads are not being" >&2
  echo "  kept at all — see docs/security-and-backups.md." >&2
}

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
ls -lh "$DIR"/db-$STAMP.dump "$DIR"/uploads-$STAMP.tar.gz 2>/dev/null | awk '{print "  "$9"  "$5}'
echo ""
echo "These are on the same machine as the site, so they do not survive losing it."
echo "Copy them somewhere else — see docs/security-and-backups.md."
