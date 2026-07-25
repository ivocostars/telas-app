#!/bin/bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/home/ubuntu/telas-app}"
API_URL="${API_URL:-http://localhost:4000}"
REPORT_API_KEY="${REPORT_API_KEY:-}"
LOG_FILE="${LOG_FILE:-/var/log/telas-maintenance.log}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "=== Inicio mantenimiento diario ==="

log "Backup de base de datos..."
if bash "$PROJECT_DIR/scripts/db-backup.sh" >> "$LOG_FILE" 2>&1; then
  log "Backup OK"
else
  log "ERROR en backup"
fi

log "Enviando reporte PDF de espectadores..."
if [ -n "$REPORT_API_KEY" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/espectadores/enviar-reporte" \
    -H "x-api-key: $REPORT_API_KEY" \
    -H "Content-Type: application/json")
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  if [ "$HTTP_CODE" = "200" ]; then
    log "Reporte enviado OK: $BODY"
  else
    log "ERROR al enviar reporte (HTTP $HTTP_CODE): $BODY"
  fi
else
  log "REPORT_API_KEY no configurada, salteando reporte"
fi

log "=== Fin mantenimiento diario ==="
echo ""
