import os
import json
import uuid
import shutil
from datetime import datetime
from typing import Optional, List

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

import sqlite3

app = FastAPI(title="Heirloom Garden Tracker")

DB_PATH = os.getenv("DATABASE_URL", "sqlite:///app/data/heirloom.db").replace("sqlite:///", "")
PHOTOS_DIR = os.getenv("PHOTOS_DIR", "/app/photos")

os.makedirs(os.path.dirname(DB_PATH) if os.path.dirname(DB_PATH) else ".", exist_ok=True)
os.makedirs(PHOTOS_DIR, exist_ok=True)


# ── Database helpers ──────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS seeds (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            variety TEXT,
            category TEXT NOT NULL,
            species TEXT,
            days_to_maturity TEXT,
            germ_rate REAL,
            lot TEXT,
            sku TEXT,
            organic INTEGER DEFAULT 0,
            supplier TEXT,
            min_seeds INTEGER,
            start_indoors INTEGER DEFAULT 0,
            direct_sow INTEGER DEFAULT 0,
            suggested_indoor_weeks INTEGER DEFAULT 0,
            spacing_inches INTEGER DEFAULT 12,
            notes TEXT
        );

        CREATE TABLE IF NOT EXISTS structures (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            width REAL NOT NULL,
            length REAL NOT NULL,
            map_x REAL,
            map_y REAL
        );

        CREATE TABLE IF NOT EXISTS plantings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seed_id TEXT NOT NULL REFERENCES seeds(id),
            structure_id TEXT REFERENCES structures(id),
            year INTEGER DEFAULT 2026,
            quantity INTEGER,
            indoor_start_date TEXT,
            hardening_date TEXT,
            transplant_date TEXT,
            direct_sow_date TEXT,
            first_harvest_date TEXT,
            status TEXT DEFAULT 'planned',
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS grid_cells (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            planting_id INTEGER NOT NULL REFERENCES plantings(id) ON DELETE CASCADE,
            structure_id TEXT NOT NULL REFERENCES structures(id),
            row INTEGER NOT NULL,
            col INTEGER NOT NULL,
            UNIQUE(structure_id, row, col)
        );

        CREATE TABLE IF NOT EXISTS planting_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            planting_id INTEGER NOT NULL REFERENCES plantings(id) ON DELETE CASCADE,
            event_date TEXT NOT NULL,
            event_type TEXT NOT NULL,
            details TEXT,
            severity TEXT,
            product_used TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            planting_id INTEGER NOT NULL REFERENCES plantings(id) ON DELETE CASCADE,
            filename TEXT NOT NULL,
            original_name TEXT,
            caption TEXT,
            taken_date TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Seed initial data if empty
    count = conn.execute("SELECT COUNT(*) FROM seeds").fetchone()[0]
    if count == 0:
        from backend.seed_data import INITIAL_SEEDS, INITIAL_STRUCTURES
        for s in INITIAL_SEEDS:
            conn.execute(
                """INSERT INTO seeds (id, name, variety, category, species, days_to_maturity,
                   germ_rate, lot, sku, organic, supplier, min_seeds, start_indoors, direct_sow,
                   suggested_indoor_weeks, spacing_inches) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (s["id"], s["name"], s["variety"], s["category"], s["species"],
                 s["days_to_maturity"], s["germ_rate"], s["lot"], s["sku"],
                 1 if s["organic"] else 0, s["supplier"], s["min_seeds"],
                 1 if s["start_indoors"] else 0, 1 if s["direct_sow"] else 0,
                 s["suggested_indoor_weeks"], s.get("spacing_inches", 12))
            )
        for st in INITIAL_STRUCTURES:
            conn.execute(
                """INSERT INTO structures (id, name, type, width, length, map_x, map_y)
                   VALUES (?,?,?,?,?,?,?)""",
                (st["id"], st["name"], st["type"], st["width"], st["length"],
                 st["map_x"], st["map_y"])
            )
    conn.commit()
    conn.close()


init_db()


# ── Pydantic models ───────────────────────────────────────────────────────────

class PlantingCreate(BaseModel):
    seed_id: str
    structure_id: Optional[str] = None
    year: int = 2026
    quantity: Optional[int] = None
    indoor_start_date: Optional[str] = None
    hardening_date: Optional[str] = None
    transplant_date: Optional[str] = None
    direct_sow_date: Optional[str] = None
    first_harvest_date: Optional[str] = None
    status: str = "planned"
    notes: Optional[str] = None


class PlantingUpdate(BaseModel):
    structure_id: Optional[str] = None
    quantity: Optional[int] = None
    indoor_start_date: Optional[str] = None
    hardening_date: Optional[str] = None
    transplant_date: Optional[str] = None
    direct_sow_date: Optional[str] = None
    first_harvest_date: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class EventCreate(BaseModel):
    event_date: str
    event_type: str
    details: Optional[str] = None
    severity: Optional[str] = None
    product_used: Optional[str] = None


class SeedCreate(BaseModel):
    name: str
    category: str
    variety: Optional[str] = None
    species: Optional[str] = None
    days_to_maturity: Optional[str] = None
    germ_rate: Optional[float] = None
    lot: Optional[str] = None
    sku: Optional[str] = None
    organic: bool = False
    supplier: Optional[str] = None
    min_seeds: Optional[int] = None
    start_indoors: bool = False
    direct_sow: bool = False
    suggested_indoor_weeks: int = 0
    spacing_inches: int = 12


# ── API Routes ────────────────────────────────────────────────────────────────

@app.get("/api/seeds")
def list_seeds():
    conn = get_db()
    rows = conn.execute("SELECT * FROM seeds ORDER BY category, name").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/seeds")
def create_seed(data: SeedCreate):
    conn = get_db()
    seed_id = data.name.lower().replace(" ", "-").replace("'", "")
    existing = conn.execute("SELECT id FROM seeds WHERE id = ?", (seed_id,)).fetchone()
    suffix = 1
    base_id = seed_id
    while existing:
        seed_id = f"{base_id}-{suffix}"
        existing = conn.execute("SELECT id FROM seeds WHERE id = ?", (seed_id,)).fetchone()
        suffix += 1
    conn.execute(
        """INSERT INTO seeds (id, name, variety, category, species, days_to_maturity,
           germ_rate, lot, sku, organic, supplier, min_seeds, start_indoors, direct_sow,
           suggested_indoor_weeks, spacing_inches) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (seed_id, data.name, data.variety or data.name, data.category, data.species,
         data.days_to_maturity, data.germ_rate, data.lot, data.sku,
         1 if data.organic else 0, data.supplier, data.min_seeds,
         1 if data.start_indoors else 0, 1 if data.direct_sow else 0,
         data.suggested_indoor_weeks, data.spacing_inches)
    )
    conn.commit()
    conn.close()
    return {"id": seed_id, "message": "Seed created"}


@app.put("/api/seeds/{seed_id}")
def update_seed(seed_id: str, data: SeedCreate):
    conn = get_db()
    existing = conn.execute("SELECT id FROM seeds WHERE id = ?", (seed_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(404, "Seed not found")
    conn.execute(
        """UPDATE seeds SET name=?, variety=?, category=?, species=?, days_to_maturity=?,
           germ_rate=?, lot=?, sku=?, organic=?, supplier=?, min_seeds=?,
           start_indoors=?, direct_sow=?, suggested_indoor_weeks=?, spacing_inches=?
           WHERE id=?""",
        (data.name, data.variety or data.name, data.category, data.species,
         data.days_to_maturity, data.germ_rate, data.lot, data.sku,
         1 if data.organic else 0, data.supplier, data.min_seeds,
         1 if data.start_indoors else 0, 1 if data.direct_sow else 0,
         data.suggested_indoor_weeks, data.spacing_inches, seed_id)
    )
    conn.commit()
    conn.close()
    return {"message": "Seed updated"}


@app.get("/api/structures")
def list_structures():
    conn = get_db()
    rows = conn.execute("SELECT * FROM structures ORDER BY type, name").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/plantings")
def list_plantings(year: int = 2026):
    conn = get_db()
    rows = conn.execute("""
        SELECT p.*, s.name as seed_name, s.category, s.days_to_maturity,
               s.organic, s.variety, st.name as structure_name
        FROM plantings p
        JOIN seeds s ON p.seed_id = s.id
        LEFT JOIN structures st ON p.structure_id = st.id
        WHERE p.year = ?
        ORDER BY p.created_at
    """, (year,)).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        # Fetch events
        events = conn.execute(
            "SELECT * FROM planting_events WHERE planting_id = ? ORDER BY event_date",
            (d["id"],)
        ).fetchall()
        d["events"] = [dict(e) for e in events]
        # Fetch photo count
        photo_count = conn.execute(
            "SELECT COUNT(*) FROM photos WHERE planting_id = ?", (d["id"],)
        ).fetchone()[0]
        d["photo_count"] = photo_count
        result.append(d)
    conn.close()
    return result


@app.post("/api/plantings")
def create_planting(data: PlantingCreate):
    conn = get_db()
    # Verify seed exists
    seed = conn.execute("SELECT id FROM seeds WHERE id = ?", (data.seed_id,)).fetchone()
    if not seed:
        conn.close()
        raise HTTPException(404, "Seed not found")
    cursor = conn.execute(
        """INSERT INTO plantings (seed_id, structure_id, year, quantity,
           indoor_start_date, hardening_date, transplant_date, direct_sow_date,
           first_harvest_date, status, notes)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
        (data.seed_id, data.structure_id, data.year, data.quantity,
         data.indoor_start_date, data.hardening_date, data.transplant_date,
         data.direct_sow_date, data.first_harvest_date, data.status, data.notes)
    )
    conn.commit()
    planting_id = cursor.lastrowid
    conn.close()
    return {"id": planting_id, "message": "Planting created"}


@app.post("/api/plantings/{planting_id}/duplicate")
def duplicate_planting(planting_id: int):
    conn = get_db()
    original = conn.execute("SELECT * FROM plantings WHERE id = ?", (planting_id,)).fetchone()
    if not original:
        conn.close()
        raise HTTPException(404, "Planting not found")
    o = dict(original)
    cursor = conn.execute(
        """INSERT INTO plantings (seed_id, structure_id, year, quantity,
           indoor_start_date, hardening_date, transplant_date, direct_sow_date,
           first_harvest_date, status, notes)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
        (o["seed_id"], None, o["year"], o["quantity"],
         o["indoor_start_date"], o["hardening_date"], o["transplant_date"],
         o["direct_sow_date"], o["first_harvest_date"], o["status"],
         o["notes"])
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return {"id": new_id, "message": "Planting duplicated"}
def update_planting(planting_id: int, data: PlantingUpdate):
    conn = get_db()
    existing = conn.execute("SELECT id FROM plantings WHERE id = ?", (planting_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(404, "Planting not found")

    updates = []
    values = []
    for field, val in data.dict(exclude_unset=True).items():
        updates.append(f"{field} = ?")
        values.append(val)

    if updates:
        updates.append("updated_at = ?")
        values.append(datetime.utcnow().isoformat())
        values.append(planting_id)
        conn.execute(f"UPDATE plantings SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()
    conn.close()
    return {"message": "Planting updated"}


@app.delete("/api/plantings/{planting_id}")
def delete_planting(planting_id: int):
    conn = get_db()
    conn.execute("DELETE FROM plantings WHERE id = ?", (planting_id,))
    conn.commit()
    conn.close()
    return {"message": "Planting deleted"}


# ── Events ────────────────────────────────────────────────────────────────────

@app.post("/api/plantings/{planting_id}/events")
def create_event(planting_id: int, data: EventCreate):
    conn = get_db()
    existing = conn.execute("SELECT id FROM plantings WHERE id = ?", (planting_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(404, "Planting not found")
    cursor = conn.execute(
        """INSERT INTO planting_events (planting_id, event_date, event_type, details, severity, product_used)
           VALUES (?,?,?,?,?,?)""",
        (planting_id, data.event_date, data.event_type, data.details,
         data.severity, data.product_used)
    )
    conn.commit()
    event_id = cursor.lastrowid
    conn.close()
    return {"id": event_id, "message": "Event created"}


@app.delete("/api/events/{event_id}")
def delete_event(event_id: int):
    conn = get_db()
    conn.execute("DELETE FROM planting_events WHERE id = ?", (event_id,))
    conn.commit()
    conn.close()
    return {"message": "Event deleted"}


# ── Grid Cells ────────────────────────────────────────────────────────────────

@app.get("/api/structures/{structure_id}/grid")
def get_grid(structure_id: str):
    conn = get_db()
    rows = conn.execute("""
        SELECT gc.row, gc.col, gc.planting_id, p.seed_id, s.name as seed_name,
               s.category, s.spacing_inches
        FROM grid_cells gc
        JOIN plantings p ON gc.planting_id = p.id
        JOIN seeds s ON p.seed_id = s.id
        WHERE gc.structure_id = ?
    """, (structure_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


class GridUpdate(BaseModel):
    planting_id: int
    cells: list  # list of {"row": int, "col": int}


@app.post("/api/structures/{structure_id}/grid")
def update_grid(structure_id: str, data: GridUpdate):
    conn = get_db()
    for cell in data.cells:
        try:
            conn.execute(
                """INSERT OR REPLACE INTO grid_cells (planting_id, structure_id, row, col)
                   VALUES (?,?,?,?)""",
                (data.planting_id, structure_id, cell["row"], cell["col"])
            )
        except Exception:
            pass
    # Update planting quantity based on cell count
    total = conn.execute(
        "SELECT COUNT(*) FROM grid_cells WHERE planting_id = ?", (data.planting_id,)
    ).fetchone()[0]
    conn.execute("UPDATE plantings SET quantity = ?, structure_id = ? WHERE id = ?",
                 (total, structure_id, data.planting_id))
    conn.commit()
    conn.close()
    return {"message": "Grid updated", "cell_count": total}


@app.delete("/api/structures/{structure_id}/grid/cells")
def delete_grid_cells(structure_id: str, planting_id: int = Query(...), rows: str = Query(""), cols: str = Query("")):
    conn = get_db()
    if rows and cols:
        row_list = [int(r) for r in rows.split(",")]
        col_list = [int(c) for c in cols.split(",")]
        for r, c in zip(row_list, col_list):
            conn.execute("DELETE FROM grid_cells WHERE structure_id = ? AND row = ? AND col = ?",
                         (structure_id, r, c))
    else:
        conn.execute("DELETE FROM grid_cells WHERE structure_id = ? AND planting_id = ?",
                     (structure_id, planting_id))
    total = conn.execute(
        "SELECT COUNT(*) FROM grid_cells WHERE planting_id = ?", (planting_id,)
    ).fetchone()[0]
    conn.execute("UPDATE plantings SET quantity = ? WHERE id = ?", (total, planting_id))
    conn.commit()
    conn.close()
    return {"message": "Cells removed"}


# ── Photos ────────────────────────────────────────────────────────────────────

@app.post("/api/plantings/{planting_id}/photos")
async def upload_photo(
    planting_id: int,
    file: UploadFile = File(...),
    caption: str = Form(""),
    taken_date: str = Form("")
):
    conn = get_db()
    existing = conn.execute("SELECT id FROM plantings WHERE id = ?", (planting_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(404, "Planting not found")

    ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    filename = f"{planting_id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(PHOTOS_DIR, filename)

    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)

    if not taken_date:
        taken_date = datetime.utcnow().strftime("%Y-%m-%d")

    cursor = conn.execute(
        """INSERT INTO photos (planting_id, filename, original_name, caption, taken_date)
           VALUES (?,?,?,?,?)""",
        (planting_id, filename, file.filename, caption, taken_date)
    )
    conn.commit()
    photo_id = cursor.lastrowid
    conn.close()
    return {"id": photo_id, "filename": filename, "message": "Photo uploaded"}


@app.get("/api/plantings/{planting_id}/photos")
def list_photos(planting_id: int):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM photos WHERE planting_id = ? ORDER BY taken_date", (planting_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.delete("/api/photos/{photo_id}")
def delete_photo(photo_id: int):
    conn = get_db()
    photo = conn.execute("SELECT filename FROM photos WHERE id = ?", (photo_id,)).fetchone()
    if photo:
        filepath = os.path.join(PHOTOS_DIR, photo["filename"])
        if os.path.exists(filepath):
            os.remove(filepath)
        conn.execute("DELETE FROM photos WHERE id = ?", (photo_id,))
        conn.commit()
    conn.close()
    return {"message": "Photo deleted"}


# ── Export / Import ───────────────────────────────────────────────────────────

@app.get("/api/export")
def export_data():
    conn = get_db()
    data = {
        "exported_at": datetime.utcnow().isoformat(),
        "seeds": [dict(r) for r in conn.execute("SELECT * FROM seeds").fetchall()],
        "structures": [dict(r) for r in conn.execute("SELECT * FROM structures").fetchall()],
        "plantings": [dict(r) for r in conn.execute("SELECT * FROM plantings").fetchall()],
        "events": [dict(r) for r in conn.execute("SELECT * FROM planting_events").fetchall()],
        "photos": [dict(r) for r in conn.execute("SELECT * FROM photos").fetchall()],
        "grid_cells": [dict(r) for r in conn.execute("SELECT * FROM grid_cells").fetchall()],
    }
    conn.close()
    return JSONResponse(content=data)


@app.post("/api/import")
async def import_data(file: UploadFile = File(...)):
    content = await file.read()
    data = json.loads(content)
    conn = get_db()

    # Clear existing data
    conn.executescript("""
        DELETE FROM grid_cells;
        DELETE FROM photos;
        DELETE FROM planting_events;
        DELETE FROM plantings;
        DELETE FROM structures;
        DELETE FROM seeds;
    """)

    for s in data.get("seeds", []):
        conn.execute(
            """INSERT INTO seeds (id, name, variety, category, species, days_to_maturity,
               germ_rate, lot, sku, organic, supplier, min_seeds, start_indoors, direct_sow,
               suggested_indoor_weeks, spacing_inches, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (s["id"], s["name"], s.get("variety"), s["category"], s.get("species"),
             s.get("days_to_maturity"), s.get("germ_rate"), s.get("lot"), s.get("sku"),
             s.get("organic", 0), s.get("supplier"), s.get("min_seeds"),
             s.get("start_indoors", 0), s.get("direct_sow", 0),
             s.get("suggested_indoor_weeks", 0), s.get("spacing_inches", 12), s.get("notes"))
        )

    for st in data.get("structures", []):
        conn.execute(
            """INSERT INTO structures (id, name, type, width, length, map_x, map_y)
               VALUES (?,?,?,?,?,?,?)""",
            (st["id"], st["name"], st["type"], st["width"], st["length"],
             st.get("map_x"), st.get("map_y"))
        )

    for p in data.get("plantings", []):
        conn.execute(
            """INSERT INTO plantings (id, seed_id, structure_id, year, quantity,
               indoor_start_date, hardening_date, transplant_date, direct_sow_date,
               first_harvest_date, status, notes, created_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (p["id"], p["seed_id"], p.get("structure_id"), p.get("year", 2026),
             p.get("quantity"), p.get("indoor_start_date"), p.get("hardening_date"),
             p.get("transplant_date"), p.get("direct_sow_date"),
             p.get("first_harvest_date"), p.get("status", "planned"),
             p.get("notes"), p.get("created_at"), p.get("updated_at"))
        )

    for e in data.get("events", []):
        conn.execute(
            """INSERT INTO planting_events (id, planting_id, event_date, event_type,
               details, severity, product_used, created_at)
               VALUES (?,?,?,?,?,?,?,?)""",
            (e["id"], e["planting_id"], e["event_date"], e["event_type"],
             e.get("details"), e.get("severity"), e.get("product_used"), e.get("created_at"))
        )

    for ph in data.get("photos", []):
        conn.execute(
            """INSERT INTO photos (id, planting_id, filename, original_name, caption, taken_date, created_at)
               VALUES (?,?,?,?,?,?,?)""",
            (ph["id"], ph["planting_id"], ph["filename"], ph.get("original_name"),
             ph.get("caption"), ph.get("taken_date"), ph.get("created_at"))
        )

    for gc in data.get("grid_cells", []):
        conn.execute(
            """INSERT INTO grid_cells (id, planting_id, structure_id, row, col)
               VALUES (?,?,?,?,?)""",
            (gc["id"], gc["planting_id"], gc["structure_id"], gc["row"], gc["col"])
        )

    conn.commit()
    conn.close()
    return {"message": "Data imported successfully"}


# ── Photo serving ─────────────────────────────────────────────────────────────

@app.get("/photos/{filename}")
async def serve_photo(filename: str):
    filepath = os.path.join(PHOTOS_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(404, "Photo not found")
    return FileResponse(filepath)


# ── Serve frontend (must be last) ─────────────────────────────────────────────

if os.path.exists("/app/static"):
    app.mount("/assets", StaticFiles(directory="/app/static/assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = f"/app/static/{full_path}"
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse("/app/static/index.html")
