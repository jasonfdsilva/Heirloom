# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Heirloom** is a home garden planning and management application for a single household garden (Berkeley Heights, NJ — Zone 6b, zip 07922).

- **Owner:** Personal use — primary users are the owner and wife Andrea (both owners/editors)
- **Stack:** FastAPI (Python 3.12) + PostgreSQL 16 + React 18 + TypeScript
- **Local runtime:** Mac Mini M4 Pro, 64GB RAM, 2TB storage, macOS Tahoe 26.3
- **Local storage:** MinIO (S3-compatible, runs in Docker)

## Repository Structure

```
backend/    FastAPI app, SQLAlchemy models, Alembic migrations
frontend/   React + TypeScript + Vite + Tailwind SPA
docker-compose.yml   PostgreSQL + MinIO (local dev)
```

## Prerequisites

- [uv](https://github.com/astral-sh/uv) — Python package manager
- [Node.js](https://nodejs.org) 20+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Setup

```bash
# 1. Start database and file storage
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env          # edit ANTHROPIC_API_KEY
uv sync
uv run alembic upgrade head   # run migrations
uv run uvicorn app.main:app --reload --port 8000

# 3. Frontend (separate terminal)
cd frontend
npm install
npm run dev                   # starts on http://localhost:5173
```

## Common Commands

### Backend

```bash
cd backend

# Run dev server
uv run uvicorn app.main:app --reload --port 8000

# Run tests
uv run pytest

# Run a single test
uv run pytest tests/test_auth.py::test_login -v

# Lint
uv run ruff check .
uv run ruff format .

# Create a new migration after model changes
uv run alembic revision --autogenerate -m "description of change"

# Apply migrations
uv run alembic upgrade head

# Rollback one migration
uv run alembic downgrade -1
```

### Frontend

```bash
cd frontend

npm run dev       # dev server with hot reload
npm run build     # production build
npm run lint      # ESLint
```

### Docker

```bash
docker compose up -d          # start postgres + minio
docker compose down           # stop
docker compose down -v        # stop and delete volumes (resets all data)
```

## API Documentation

When the backend is running, interactive docs are at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Architecture

```
Browser (React SPA, :5173)
  └── /api proxy → FastAPI (:8000)
                      ├── PostgreSQL (:5432)
                      └── MinIO S3 (:9000)
```

- **Auth:** JWT access + refresh tokens, role-based per garden (`owner | editor | viewer`)
- **File storage:** MinIO locally; swap to Backblaze B2 or AWS S3 in prod by changing `S3_ENDPOINT_URL` in `.env`
- **Seed packet extraction:** Claude API (`claude-opus-4-6`) with vision — `POST /varieties/extract-packet`
- **Frost dates:** Hardcoded for zip 07922 (last frost Apr 23, first frost Oct 22); editable per garden

## Key Domain Concepts

- `PlantVariety` — botanical definition, reusable across seasons
- `SeedLot` — a specific packet/purchase linked to a variety (lot number, germ rate, etc.)
- `GardenSeason` — one calendar year; has `delay_weeks` for projected delay tracking
- `GrowingSpace` — a raised bed or container
- `PlantingEvent` — one sowing/planting in a space; has planned vs. actual dates
- `MaintenanceLog` / `IssueLog` / `HarvestRecord` / `PlantPhoto` — all keyed to a PlantingEvent

## Environment Variables

See `backend/.env.example`. Key vars:
- `DATABASE_URL` — PostgreSQL connection string
- `SECRET_KEY` — JWT signing key (change in production)
- `ANTHROPIC_API_KEY` — required for seed packet extraction
- `S3_ENDPOINT_URL` — MinIO locally (`http://localhost:9000`), real S3 in prod
