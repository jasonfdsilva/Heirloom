#!/usr/bin/env bash
# scripts/snapshot-to-dev.sh
#
# Copies the production SQLite database from the production container into
# the dev/sandbox container. NEVER writes to or restarts the production
# container — it is read-only from this script's perspective.
#
# Usage:
#   bash scripts/snapshot-to-dev.sh
#   npm run sandbox:snapshot   (from frontend/)
#
# Both containers must be running before this script is called:
#   Production:  docker compose up -d
#   Sandbox:     docker compose -f docker-compose.dev.yml up -d --build

set -euo pipefail

PROD_CONTAINER="heirloom-heirloom-1"
DEV_CONTAINER="heirloom-dev"
DB_PATH="/app/data/heirloom.db"
TMP_FILE="/tmp/heirloom-snapshot-$$.db"

# ── 1. Verify production container is running ─────────────────────────────────
echo "→ Checking production container..."
if ! docker ps --format '{{.Names}}' | grep -q "^${PROD_CONTAINER}$"; then
  echo "ERROR: Production container '${PROD_CONTAINER}' is not running."
  echo "       Start it with: docker compose up -d"
  exit 1
fi
echo "  ✓ ${PROD_CONTAINER} is running"

# ── 2. Verify dev container is running ───────────────────────────────────────
echo "→ Checking dev container..."
if ! docker ps --format '{{.Names}}' | grep -q "^${DEV_CONTAINER}$"; then
  echo "ERROR: Dev container '${DEV_CONTAINER}' is not running."
  echo "       Start it with: docker compose -f docker-compose.dev.yml up -d --build"
  echo "       Or from frontend/: npm run sandbox:up"
  exit 1
fi
echo "  ✓ ${DEV_CONTAINER} is running"

# ── 3. Flush WAL to main DB file for a consistent snapshot ───────────────────
# sqlite3 is not available inside the container, so we use the Python sqlite3
# module (available in the Python image) to checkpoint the WAL.
echo "→ Flushing WAL on production database..."
docker exec "${PROD_CONTAINER}" python3 -c \
  "import sqlite3; c=sqlite3.connect('${DB_PATH}'); c.execute('PRAGMA wal_checkpoint(TRUNCATE)'); c.close()" \
  2>/dev/null || echo "  (WAL flush skipped — sqlite3 may not be available, snapshot may still be consistent)"

# ── 4. Copy DB out of production (READ-ONLY — never writes back to prod) ──────
echo "→ Copying production database..."
docker cp "${PROD_CONTAINER}:${DB_PATH}" "${TMP_FILE}"
SIZE=$(du -h "${TMP_FILE}" | cut -f1)
echo "  ✓ Snapshot taken (${SIZE})"

# ── 5. Copy snapshot into dev container ──────────────────────────────────────
echo "→ Installing snapshot into sandbox..."
docker cp "${TMP_FILE}" "${DEV_CONTAINER}:${DB_PATH}"
echo "  ✓ Snapshot installed"

# ── 6. Clean up temp file ────────────────────────────────────────────────────
rm -f "${TMP_FILE}"

# ── 7. Restart dev container to reload the database ─────────────────────────
echo "→ Restarting sandbox..."
docker restart "${DEV_CONTAINER}" > /dev/null
echo "  ✓ Sandbox restarted"

# ── 8. Wait for sandbox to be healthy ────────────────────────────────────────
echo "→ Waiting for sandbox at http://localhost:8086..."
for i in $(seq 1 20); do
  if curl -sf http://localhost:8086/api/seeds > /dev/null 2>&1; then
    echo "  ✓ Sandbox is ready at http://localhost:8086"
    echo ""
    echo "Snapshot complete. Sandbox mirrors production data."
    exit 0
  fi
  echo "  Waiting... (${i}/20)"
  sleep 2
done

echo "WARNING: Sandbox did not respond within 40 seconds."
echo "         Check logs: docker logs ${DEV_CONTAINER}"
exit 1
