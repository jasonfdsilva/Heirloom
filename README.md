# 🌱 Heirloom Garden Tracker

A personal garden planning and management app for the 2026 growing season.
Built for Berkeley Heights, NJ (Zone 6b).

## Features

- **Seed Inventory**: All 29 Johnny's Selected Seeds varieties pre-loaded with germination rates, lot numbers, days to maturity, and planting methods
- **Garden Map**: Visual map of 8 raised beds and 16 boxes with dimensions
- **Planting Calendar**: Gantt-style view with Zone 6b suggested dates (last frost April 15)
- **Plant Tracking**: Track indoor start, hardening off, transplant, direct sow, and harvest dates
- **Event Logging**: Record fertilizer applications, disease/pest issues, pruning, watering, harvesting, and observations
- **Photo Timeline**: Upload photos per planting to document growth progression
- **Data Backup**: Export/import all data as JSON files

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: FastAPI (Python)
- **Database**: SQLite (persisted via Docker volume)
- **Photos**: Stored on Docker volume (local filesystem)
- **Container**: Single Docker image

## Quick Start (Mac Mini with Docker Desktop)

### 1. Copy this folder to your Mac Mini

Copy the entire `heirloom` folder to wherever you keep projects, for example:

```bash
# From your Mac Mini terminal:
cd ~/projects
# (copy or git clone the heirloom folder here)
```

### 2. Build and run

```bash
cd ~/projects/heirloom
docker compose up --build -d
```

The first build takes a couple minutes (downloading Node.js and Python images, installing packages). After that it starts in seconds.

### 3. Open in your browser

Go to: **http://localhost:8085**

That is it! The app is running.

### 4. Stop the app

```bash
docker compose down
```

Your data is safe in Docker volumes and will be there when you start back up.

## Data Persistence

- **Database**: Stored in the `heirloom-data` Docker volume (SQLite file)
- **Photos**: Stored in the `heirloom-photos` Docker volume
- **Backup**: Use the Export JSON button in the app to download a full backup anytime. You can restore it with the Import button.

### Manual backup of the SQLite database

```bash
docker cp $(docker compose ps -q heirloom):/app/data/heirloom.db ./heirloom-backup.db
```

### Manual backup of photos

```bash
docker cp $(docker compose ps -q heirloom):/app/photos ./photos-backup
```

## Development (optional)

If you want to develop locally without Docker:

### Backend
```bash
cd backend
pip install fastapi uvicorn python-multipart aiofiles
DATABASE_URL=sqlite:///./data/heirloom.db PHOTOS_DIR=./photos uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies API calls to localhost:8000.

## Project Structure

```
heirloom/
  docker-compose.yml     # Single service config
  Dockerfile             # Multi-stage build (Node + Python)
  backend/
    main.py              # FastAPI app with all endpoints
    models.py            # SQLAlchemy models (reference)
    seed_data.py         # Initial seed and structure data
  frontend/
    src/
      App.jsx            # Main React application
      main.jsx           # Entry point
    index.html
    vite.config.js
    package.json
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/seeds | List all seed varieties |
| GET | /api/structures | List all beds and boxes |
| GET | /api/plantings?year=2026 | List plantings with events |
| POST | /api/plantings | Create a new planting |
| PUT | /api/plantings/:id | Update a planting |
| DELETE | /api/plantings/:id | Delete a planting |
| POST | /api/plantings/:id/events | Log an event |
| DELETE | /api/events/:id | Delete an event |
| POST | /api/plantings/:id/photos | Upload a photo |
| GET | /api/plantings/:id/photos | List photos for a planting |
| DELETE | /api/photos/:id | Delete a photo |
| GET | /api/export | Export all data as JSON |
| POST | /api/import | Import data from JSON file |
