#!/bin/bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/telas-app/db}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE=$(date +%Y%m%d-%H%M%S)
PROJECT_DIR="${PROJECT_DIR:-/home/ubuntu/telas-app}"
DB_USER="${DB_USER:-telas}"
DB_NAME="${DB_NAME:-telas_app}"

mkdir -p "$BACKUP_DIR"

cd "$PROJECT_DIR"

docker compose exec -T db pg_dump -U "$DB_USER" "$DB_NAME" \
  --format=custom \
  --compress=9 \
  > "$BACKUP_DIR/backup-$DATE.dump"

echo "OK | $DATE | backup-$DATE.dump ($(du -h "$BACKUP_DIR/backup-$DATE.dump" | cut -f1))"

find "$BACKUP_DIR" -name "backup-*.dump" -mtime "+$RETENTION_DAYS" -delete
