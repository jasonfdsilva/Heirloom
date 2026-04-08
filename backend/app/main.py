import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.app.database import init_db, migrate_db, PHOTOS_DIR
from backend.app.routers import (
    seeds,
    plantings,
    events,
    photos,
    structures,
    grid,
    plants,
    dashboard,
    label_positions,
    seed_lots,
)


@asynccontextmanager
async def lifespan(app: FastAPI):  # pragma: no cover
    init_db()
    migrate_db()
    yield


app = FastAPI(title="Heirloom Garden Tracker", lifespan=lifespan)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(seeds.router)
app.include_router(plantings.router)
app.include_router(events.router)
app.include_router(photos.router)
app.include_router(structures.router)
app.include_router(grid.router)
app.include_router(plants.router)
app.include_router(dashboard.router)
app.include_router(label_positions.router)
app.include_router(seed_lots.router)


# ── Photo serving ─────────────────────────────────────────────────────────────

@app.get("/photos/{filename}")
async def serve_photo(filename: str):
    # Reject filenames containing path separators before any filesystem access
    if "/" in filename or "\\" in filename:
        raise HTTPException(404, "Photo not found")
    # Normalize to prevent path traversal (e.g. ../../etc/passwd)
    safe_dir = os.path.realpath(PHOTOS_DIR)
    filepath = os.path.realpath(os.path.join(PHOTOS_DIR, filename))
    if not filepath.startswith(safe_dir + os.sep):
        raise HTTPException(404, "Photo not found")
    if not os.path.exists(filepath):
        raise HTTPException(404, "Photo not found")
    return FileResponse(filepath)


# ── Serve frontend (must be last) ─────────────────────────────────────────────

STATIC_DIR = "/app/static"

if os.path.exists(STATIC_DIR):  # pragma: no cover
    app.mount("/assets", StaticFiles(directory=f"{STATIC_DIR}/assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Empty path → index.html (avoids edge case in realpath comparison)
        if not full_path:
            return FileResponse(f"{STATIC_DIR}/index.html")
        # Reject obvious traversal attempts before filesystem access
        if full_path.startswith("/") or "\\" in full_path:
            return FileResponse(f"{STATIC_DIR}/index.html")
        safe_dir = os.path.realpath(STATIC_DIR)
        file_path = os.path.realpath(os.path.join(STATIC_DIR, full_path))
        # Reject paths that escape the static directory
        if not file_path.startswith(safe_dir + os.sep):
            return FileResponse(f"{STATIC_DIR}/index.html")
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(f"{STATIC_DIR}/index.html")
