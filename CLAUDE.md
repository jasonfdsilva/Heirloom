# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project

**Heirloom** is a personal home garden planning and management application.

- **Stack:** FastAPI (Python 3.12) + SQLite + React 18 (Vite + Tailwind)
- **Runtime:** Single Docker container, multi-stage build (Node frontend → Python backend)
- **Database:** SQLite at `/app/data/heirloom.db` inside the container, persisted via named Docker volume

## Repository Structure

```
backend/          FastAPI app, SQLite schema/migrations, seed data
frontend/         React + Vite SPA, Vitest unit tests, Playwright E2E tests
docker-compose.yml          Production instance (port 8085) — NEVER touch
docker-compose.dev.yml      Dev/sandbox instance (port 8086) — safe for all work
scripts/
  snapshot-to-dev.sh        Copies production DB into sandbox (read-only from prod)
Dockerfile                  Multi-stage build
```

---

## Environments

### ⛔ Production — Port 8085 — NEVER TOUCHED BY TESTS OR CLAUDE

| Property | Value |
|----------|-------|
| Container | `heirloom-heirloom-1` |
| URL | `http://localhost:8085` |
| Volumes | `heirloom_heirloom-data`, `heirloom_heirloom-photos` |
| Start | `docker compose up -d` |

**Claude must never:**
- Write to or modify the production database
- Run tests against port 8085 locally
- Run `docker compose down -v` (destroys all production data)
- Run `docker cp` that writes INTO the production container

### ✅ Sandbox / Dev — Port 8086 — Safe for all testing and development

| Property | Value |
|----------|-------|
| Container | `heirloom-dev` |
| URL | `http://localhost:8086` |
| Volumes | `heirloom-dev_heirloom-dev-data`, `heirloom-dev_heirloom-dev-photos` |
| Compose file | `docker-compose.dev.yml` |

The sandbox starts with an empty database if no snapshot has been run. The app's
`init_db()` seeds the schema and reference data on first start.

---

## Sandbox Workflow

```bash
# 1. Start sandbox (from repo root or frontend/)
docker compose -f docker-compose.dev.yml up -d --build
# or: cd frontend && npm run sandbox:up

# 2. Mirror production data into sandbox (both containers must be running)
bash scripts/snapshot-to-dev.sh
# or: cd frontend && npm run sandbox:snapshot

# 3. Run E2E tests — targets port 8086 by default
cd frontend && npm run test:e2e

# 4. Stop sandbox when done
docker compose -f docker-compose.dev.yml down
# or: cd frontend && npm run sandbox:down
```

---

## Common Commands

### Backend

```bash
cd backend

uv run uvicorn app.main:app --reload --port 8000   # dev server (local, no Docker)
uv run pytest tests/ -q                             # unit tests (in-memory DB, safe)
uv run ruff check .                                 # lint
uv run ruff format .                                # format
uv run alembic upgrade head                         # apply migrations
```

### Frontend

```bash
cd frontend

npm run dev            # Vite dev server at http://localhost:5173
npm run test           # Vitest unit tests (all mocked, no Docker needed)
npm run test:coverage  # Unit test coverage
npm run test:e2e       # Playwright E2E against sandbox (http://localhost:8086)
npm run build          # Production build
npm run lint           # ESLint
```

### Docker

```bash
# Production (treat as read-only)
docker compose up -d
docker compose logs -f heirloom
docker compose down          # safe — volumes preserved

# Sandbox (safe to experiment)
docker compose -f docker-compose.dev.yml up -d --build
docker compose -f docker-compose.dev.yml logs -f
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml down -v   # wipes sandbox data only
```

---

## Test Architecture

| Layer | Tool | DB | Target |
|-------|------|----|--------|
| Backend unit tests | pytest | In-memory SQLite (`":memory:"`) | Never hits Docker |
| Frontend unit tests | Vitest + RTL | Fully mocked API (`vi.mock`) | Never hits Docker |
| E2E tests | Playwright | Live sandbox at 8086 | `heirloom-dev` container |
| CI | GitHub Actions | Fresh Docker container | `docker compose up -d` → port 8085 |

CI explicitly sets `BASE_URL=http://localhost:8085` and starts its own fresh container,
so it is unaffected by the local default of port 8086.

---

## API Documentation

When the backend is running locally:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

When using Docker (sandbox):
- http://localhost:8086/docs

---

## Key Domain Concepts

- `seed` — a plant variety (e.g., "Carbon OG Tomato"). Reusable across seasons.
- `planting` — one sowing/growing instance in a specific year.
- `structure` — a raised bed or container.
- `grid_cell` — a cell in a bed grid assigned to a planting.
- `planting_event` — a logged observation, task, or milestone on a planting.
- `photo` — an image attached to a planting.

---

## SDLC Process

Every feature follows these steps in order:

1. **Develop** — implement the feature (backend + frontend changes)
2. **Backend tests** — add/update pytest tests so backend coverage stays at or above baseline
3. **Frontend tests** — add/update Vitest tests so frontend coverage stays at or above baseline
4. **Coverage gate** — run both coverage reports and compare against baselines (see below)
5. **Code review** — spawn a separate review agent to inspect the diff for bugs, security issues, and code quality; this is a **blocker**: present the report to the user, who may request changes before proceeding
6. **Snapshot prod → sandbox** — run `bash scripts/snapshot-to-dev.sh` so sandbox has real production data
7. **Sandbox deploy** — build and deploy to the sandbox container at port 8086
7a. **Run E2E tests against sandbox** — `cd frontend && npm run test:e2e` (targets port 8086). All tests must pass before proceeding. Fix any failures before presenting to the user.
8. **Manual gate** — tell the user "Sandbox is ready at http://localhost:8086 — please verify and confirm before I promote." Then **stop and wait**. Do NOT use the preview tool as a substitute for user verification. Do NOT proceed to step 9 until the user explicitly says the feature looks good (e.g. "looks good", "promote it", "ship it").
9. **Promote to prod** — rebuild and restart the production container at port 8085 — only after explicit user sign-off on step 8
10. **Backup** — snapshot production data if schema changed
11. **Git commit** — commit all changes with a descriptive message
12. **Push to GitHub** — `git push origin main` to sync the remote

---

## Coverage Gate

### Baselines (do not decrease without explicit user approval)

| Layer | Metric | Minimum |
|-------|--------|---------|
| Backend | Statement coverage | 95% |
| Frontend | Statement coverage | 99% |
| Frontend | Branch coverage | 90% |
| Frontend | Line coverage | 100% |

### How to check

```bash
# Backend
cd backend && uv run pytest tests/ --cov=app --cov-report=term-missing -q

# Frontend
cd frontend && PATH="/opt/homebrew/opt/node@20/bin:$PATH" npm run test:coverage
```

### Rules

- **Every new feature must include adequate tests** — Claude predicts coverage impact before finishing and writes the necessary tests as part of the feature work, not as an afterthought.
- **If coverage would decrease**, Claude must stop, explain which metrics would drop and by how much, and ask the user for explicit approval before proceeding.
- **User approval is required** any time the coverage gate cannot be met (e.g., dead code that cannot be reached, external service calls that cannot be mocked). Claude must document the specific uncoverable lines and get sign-off.
- **Executing mocks for React state-updater callbacks** — `setEditData(d => ({...}))` inner functions are never called by a plain `vi.fn()`. Use `vi.fn(fn => typeof fn === 'function' && fn({}))` to cover those inner callbacks.
- **Branch coverage pitfalls** — V8 tracks both sides of `||`, `??`, and `? :` operators. Always add a test for the falsy/null/empty branch of every conditional expression introduced in new code.
