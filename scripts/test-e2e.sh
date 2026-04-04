#!/usr/bin/env bash
# test-e2e.sh — Run Playwright E2E tests against a clean isolated container.
#
# Mirrors CI exactly: fresh empty database, port 8087, torn down after.
# Use this before every production push.
#
# Usage (from repo root):
#   bash scripts/test-e2e.sh
#
# Usage (from frontend/):
#   npm run test:e2e:clean

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="http://localhost:8087"

echo "→ Tearing down any leftover test container..."
docker compose -f "$REPO_ROOT/docker-compose.test.yml" down -v --remove-orphans 2>/dev/null || true

echo "→ Building and starting clean test container..."
docker compose -f "$REPO_ROOT/docker-compose.test.yml" up -d --build

echo "→ Waiting for app at $BASE_URL..."
for i in $(seq 1 30); do
  if curl -sf "$BASE_URL/api/seeds" > /dev/null; then
    echo "  ✓ App is ready"
    break
  fi
  echo "  Waiting... ($i/30)"
  sleep 2
done

echo "→ Running Playwright E2E tests..."
cd "$REPO_ROOT/frontend"
BASE_URL="$BASE_URL" npx playwright test
EXIT_CODE=$?

echo "→ Tearing down test container..."
docker compose -f "$REPO_ROOT/docker-compose.test.yml" down -v

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "✓ All E2E tests passed."
else
  echo "✗ E2E tests failed (exit code $EXIT_CODE)."
fi

exit $EXIT_CODE
