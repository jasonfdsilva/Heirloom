#!/usr/bin/env bash
# scripts/backup.sh
#
# Backs up the production database and all user-uploaded photos to
# /Users/jdsilva/Development/Heirloom/backups/<timestamp>/
#
# Usage:
#   bash scripts/backup.sh
#   npm run backup   (from frontend/)

set -euo pipefail

PROD_CONTAINER="heirloom-heirloom-1"
DB_PATH="/app/data/heirloom.db"
PHOTOS_PATH="/app/photos"
BACKUP_ROOT="/Users/jdsilva/Development/Heirloom/backups"
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"

# ── 1. Verify production container is running ────────────────────────────────
echo "→ Checking production container..."
if ! docker ps --format '{{.Names}}' | grep -q "^${PROD_CONTAINER}$"; then
  echo "ERROR: Production container '${PROD_CONTAINER}' is not running."
  echo "       Start it with: docker compose up -d"
  exit 1
fi
echo "  ✓ ${PROD_CONTAINER} is running"

mkdir -p "${BACKUP_DIR}"

# ── 2. Flush WAL ─────────────────────────────────────────────────────────────
echo "→ Flushing WAL on production database..."
docker exec "${PROD_CONTAINER}" python3 -c \
  "import sqlite3; c=sqlite3.connect('${DB_PATH}'); c.execute('PRAGMA wal_checkpoint(TRUNCATE)'); c.close()" \
  2>/dev/null || echo "  (WAL flush skipped)"

# ── 3. Backup database ───────────────────────────────────────────────────────
echo "→ Backing up database..."
docker cp "${PROD_CONTAINER}:${DB_PATH}" "${BACKUP_DIR}/heirloom.db"
DB_SIZE=$(du -h "${BACKUP_DIR}/heirloom.db" | cut -f1)
echo "  ✓ Database backed up (${DB_SIZE})"

# ── 4. Backup photos ─────────────────────────────────────────────────────────
echo "→ Backing up photos..."
PHOTO_COUNT=$(docker exec "${PROD_CONTAINER}" sh -c "ls ${PHOTOS_PATH} 2>/dev/null | wc -l | tr -d ' '")
if [ "${PHOTO_COUNT}" -gt 0 ]; then
  mkdir -p "${BACKUP_DIR}/photos"
  docker exec "${PROD_CONTAINER}" tar -czf - -C "${PHOTOS_PATH}" . \
    | tar -xzf - -C "${BACKUP_DIR}/photos"
  echo "  ✓ ${PHOTO_COUNT} photo(s) backed up"
else
  echo "  (no photos to back up)"
fi

# ── 5. Summary ───────────────────────────────────────────────────────────────
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
echo ""
echo "Backup complete: ${BACKUP_DIR}"
echo "Total size: ${TOTAL_SIZE}"
