#!/usr/bin/env bash
# Exemple à installer sur le VPS — NE PAS écraser sauvegarde-supabase.sh
# Cron : 15 2 * * * /usr/local/bin/sauvegarde-dettepro.sh
set -euo pipefail

RETENTION_DAYS=14
BACKUP_DIR="${BACKUP_DIR:-/var/backups/dettepro}"
mkdir -p "$BACKUP_DIR"

if [[ -z "${DETTEPRO_DATABASE_URL:-}" ]]; then
  echo "DETTEPRO_DATABASE_URL manquant" >&2
  exit 1
fi

STAMP="$(date +%F)"
OUT="$BACKUP_DIR/dettepro-$STAMP.sql.gz"

pg_dump "$DETTEPRO_DATABASE_URL" | gzip > "$OUT"
echo "OK $OUT"

find "$BACKUP_DIR" -name 'dettepro-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
