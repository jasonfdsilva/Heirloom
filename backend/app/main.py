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
    export,
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
app.include_router(export.router)
app.include_router(label_positions.router)
app.include_router(seed_lots.router)


# ── Photo serving ─────────────────────────────────────────────────────────────

@app.get("/photos/{filename}")
async def serve_photo(filename: str):
    filepath = os.path.join(PHOTOS_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(404, "Photo not found")
    return FileResponse(filepath)


# ── Serve frontend (must be last) ─────────────────────────────────────────────

if os.path.exists("/app/static"):  # pragma: no cover
    app.mount("/assets", StaticFiles(directory="/app/static/assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = f"/app/static/{full_path}"
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse("/app/static/index.html")
