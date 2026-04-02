import os
import json
import uuid
import shutil
import urllib.request
import urllib.parse
from datetime import datetime
from typing import Optional, List

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

import sqlite3

app = FastAPI(title="Heirloom Garden Tracker")

DB_PATH = os.getenv("DATABASE_URL", "sqlite:////app/data/heirloom.db").replace("sqlite:///", "")
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
            qty_started INTEGER,
            qty_planted INTEGER,
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

        CREATE TABLE IF NOT EXISTS label_positions (
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            label_x REAL,
            label_y REAL,
            orientation TEXT DEFAULT 'horizontal',
            hidden INTEGER DEFAULT 0,
            label_text TEXT,
            PRIMARY KEY (entity_type, entity_id)
        );

        CREATE TABLE IF NOT EXISTS plant_harvests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plant_guid TEXT NOT NULL,
            harvest_date TEXT NOT NULL,
            weight_oz REAL,
            count INTEGER,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_harvests_guid ON plant_harvests (plant_guid);
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
    # Idempotent migrations for columns added after initial schema
    try:
        conn.execute("ALTER TABLE planting_events ADD COLUMN quantity INTEGER")
    except Exception:
        pass  # column already exists
    try:
        conn.execute("ALTER TABLE photos ADD COLUMN event_id INTEGER REFERENCES planting_events(id)")
    except Exception:
        pass  # column already exists
    conn.commit()
    conn.close()


init_db()


def seed_prefix(seed_name: str) -> str:
    """Derive a 2-char prefix from a seed name. e.g. 'Shishito' → 'SH', 'Sun Sugar' → 'SS'."""
    words = seed_name.split()
    if len(words) == 1:
        return words[0][:2].upper()
    return (words[0][0] + words[1][0]).upper()


def migrate_db():
    """Add new columns to existing databases without losing data."""
    conn = get_db()
    planting_cols = [row[1] for row in conn.execute("PRAGMA table_info(plantings)").fetchall()]
    if "qty_started" not in planting_cols:
        conn.execute("ALTER TABLE plantings ADD COLUMN qty_started INTEGER")
        conn.execute("UPDATE plantings SET qty_started = quantity WHERE quantity IS NOT NULL")
    if "qty_planted" not in planting_cols:
        conn.execute("ALTER TABLE plantings ADD COLUMN qty_planted INTEGER")
    seed_cols = [row[1] for row in conn.execute("PRAGMA table_info(seeds)").fetchall()]
    if "image_url" not in seed_cols:
        conn.execute("ALTER TABLE seeds ADD COLUMN image_url TEXT")
    lp_cols = [row[1] for row in conn.execute("PRAGMA table_info(label_positions)").fetchall()]
    if "orientation" not in lp_cols:
        conn.execute("ALTER TABLE label_positions ADD COLUMN orientation TEXT DEFAULT 'horizontal'")
    if "hidden" not in lp_cols:
        conn.execute("ALTER TABLE label_positions ADD COLUMN hidden INTEGER DEFAULT 0")
    if "label_text" not in lp_cols:
        conn.execute("ALTER TABLE label_positions ADD COLUMN label_text TEXT")

    # Individual plant tracking — extend grid_cells
    gc_cols = [row[1] for row in conn.execute("PRAGMA table_info(grid_cells)").fetchall()]
    if "plant_guid" not in gc_cols:
        conn.execute("ALTER TABLE grid_cells ADD COLUMN plant_guid TEXT")
    if "short_id" not in gc_cols:
        conn.execute("ALTER TABLE grid_cells ADD COLUMN short_id TEXT")
    if "plant_status" not in gc_cols:
        conn.execute("ALTER TABLE grid_cells ADD COLUMN plant_status TEXT DEFAULT 'healthy'")
    if "plant_notes" not in gc_cols:
        conn.execute("ALTER TABLE grid_cells ADD COLUMN plant_notes TEXT")
    if "label_visible" not in gc_cols:
        conn.execute("ALTER TABLE grid_cells ADD COLUMN label_visible INTEGER DEFAULT 1")

    # Short label for map display
    seed_cols2 = [row[1] for row in conn.execute("PRAGMA table_info(seeds)").fetchall()]
    if "short_label" not in seed_cols2:
        conn.execute("ALTER TABLE seeds ADD COLUMN short_label TEXT")

    # Plant-level photos
    photo_cols = [row[1] for row in conn.execute("PRAGMA table_info(photos)").fetchall()]
    if "plant_guid" not in photo_cols:
        conn.execute("ALTER TABLE photos ADD COLUMN plant_guid TEXT")

    conn.commit()

    # Backfill existing cells that have no plant_guid
    cells_to_fill = conn.execute(
        "SELECT id, planting_id FROM grid_cells WHERE plant_guid IS NULL ORDER BY planting_id, id"
    ).fetchall()

    if cells_to_fill:
        # Build seed name prefix cache per planting_id
        prefix_cache = {}
        counter = {}  # planting_id -> next sequential number

        # Find max existing short_id numbers to avoid collisions
        existing_shorts = conn.execute(
            "SELECT planting_id, short_id FROM grid_cells WHERE short_id IS NOT NULL"
        ).fetchall()
        for row in existing_shorts:
            pid = row["planting_id"]
            sid = row["short_id"]
            if sid:
                try:
                    num = int(sid.split("-")[-1])
                    counter[pid] = max(counter.get(pid, 0), num)
                except ValueError:
                    pass

        for c in cells_to_fill:
            pid = c["planting_id"]
            if pid not in prefix_cache:
                row = conn.execute(
                    "SELECT s.name FROM plantings p JOIN seeds s ON p.seed_id = s.id WHERE p.id = ?",
                    (pid,)
                ).fetchone()
                prefix_cache[pid] = seed_prefix(row["name"]) if row else "XX"
            counter[pid] = counter.get(pid, 0) + 1
            new_guid = str(uuid.uuid4())
            new_short = f"{prefix_cache[pid]}-{counter[pid]:02d}"
            conn.execute(
                "UPDATE grid_cells SET plant_guid = ?, short_id = ? WHERE id = ?",
                (new_guid, new_short, c["id"])
            )
        conn.commit()

    conn.close()

migrate_db()


# ── Pydantic models ───────────────────────────────────────────────────────────

class PlantingCreate(BaseModel):
    seed_id: str
    structure_id: Optional[str] = None
    year: int = 2026
    qty_started: Optional[int] = None
    qty_planted: Optional[int] = None
    indoor_start_date: Optional[str] = None
    hardening_date: Optional[str] = None
    transplant_date: Optional[str] = None
    direct_sow_date: Optional[str] = None
    first_harvest_date: Optional[str] = None
    status: str = "planned"
    notes: Optional[str] = None


class PlantingUpdate(BaseModel):
    structure_id: Optional[str] = None
    qty_started: Optional[int] = None
    qty_planted: Optional[int] = None
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
    quantity: Optional[int] = None


class PlantUpdate(BaseModel):
    plant_status: Optional[str] = None
    plant_notes: Optional[str] = None
    label_visible: Optional[bool] = None


class FamilyNotesUpdate(BaseModel):
    notes: Optional[str] = None


class HarvestCreate(BaseModel):
    harvest_date: str
    weight_oz: Optional[float] = None
    count: Optional[int] = None
    notes: Optional[str] = None


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
    image_url: Optional[str] = None
    short_label: Optional[str] = None


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
           suggested_indoor_weeks, spacing_inches, image_url, short_label) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (seed_id, data.name, data.variety or data.name, data.category, data.species,
         data.days_to_maturity, data.germ_rate, data.lot, data.sku,
         1 if data.organic else 0, data.supplier, data.min_seeds,
         1 if data.start_indoors else 0, 1 if data.direct_sow else 0,
         data.suggested_indoor_weeks, data.spacing_inches, data.image_url, data.short_label)
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
           start_indoors=?, direct_sow=?, suggested_indoor_weeks=?, spacing_inches=?, image_url=?, short_label=?
           WHERE id=?""",
        (data.name, data.variety or data.name, data.category, data.species,
         data.days_to_maturity, data.germ_rate, data.lot, data.sku,
         1 if data.organic else 0, data.supplier, data.min_seeds,
         1 if data.start_indoors else 0, 1 if data.direct_sow else 0,
         data.suggested_indoor_weeks, data.spacing_inches, data.image_url, data.short_label, seed_id)
    )
    conn.commit()
    conn.close()
    return {"message": "Seed updated"}


@app.patch("/api/seeds/{seed_id}/label")
def patch_seed_label(seed_id: int, data: dict):
    conn = get_db()
    conn.execute("UPDATE seeds SET short_label=? WHERE id=?", (data.get("short_label"), seed_id))
    conn.commit()
    conn.close()
    return {"message": "Label updated"}


def _wikipedia_image(query: str) -> Optional[str]:
    """Fetch a thumbnail URL from Wikipedia for the given search query."""
    try:
        encoded = urllib.parse.quote(query)
        url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{encoded}"
        req = urllib.request.Request(url, headers={"User-Agent": "Heirloom/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
            thumb = data.get("thumbnail", {})
            src = thumb.get("source")
            if src:
                # Request a larger size (300px wide)
                src = src.replace("/320px-", "/300px-").replace("/220px-", "/300px-")
                return src
    except Exception:
        pass
    return None


@app.get("/api/seeds/image-search")
def seed_image_search(q: str):
    """Search Wikipedia for a plant thumbnail image."""
    # Try exact query, then strip trailing words like "OG", "F1"
    url = _wikipedia_image(q)
    if not url:
        # Strip common suffixes and try again
        simplified = q.replace(" OG", "").replace(" F1", "").replace(" Mix", "").strip()
        if simplified != q:
            url = _wikipedia_image(simplified)
    return {"image_url": url}


@app.post("/api/seeds/fetch-images")
def fetch_all_images():
    """Bulk-fetch Wikipedia thumbnails for all seeds missing an image_url."""
    conn = get_db()
    seeds = conn.execute("SELECT id, name, variety, category FROM seeds WHERE image_url IS NULL OR image_url = ''").fetchall()
    updated = 0
    CATEGORY_FALLBACKS = {
        "Tomatoes": "Tomato", "Peppers": "Capsicum", "Herbs": "Herb",
        "Greens": "Leaf vegetable", "Beans": "Bean", "Brassicas": "Brassica",
        "Alliums": "Allium", "Cucurbits": "Cucurbit", "Root Vegetables": "Root vegetable",
    }
    for seed in seeds:
        url = _wikipedia_image(seed["name"])
        if not url and seed["variety"] and seed["variety"] != seed["name"]:
            url = _wikipedia_image(seed["variety"])
        if not url:
            fallback = CATEGORY_FALLBACKS.get(seed["category"], seed["category"])
            url = _wikipedia_image(fallback)
        if url:
            conn.execute("UPDATE seeds SET image_url = ? WHERE id = ?", (url, seed["id"]))
            updated += 1
    conn.commit()
    conn.close()
    return {"updated": updated, "total": len(seeds)}


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

    # Build grid cell summary: per planting, which structures and how many cells total
    grid_rows = conn.execute("""
        SELECT planting_id, structure_id, COUNT(*) as cells
        FROM grid_cells GROUP BY planting_id, structure_id
    """).fetchall()
    grid_by_planting = {}
    for gr in grid_rows:
        pid = gr["planting_id"]
        if pid not in grid_by_planting:
            grid_by_planting[pid] = {"structures": [], "total": 0}
        grid_by_planting[pid]["structures"].append(gr["structure_id"])
        grid_by_planting[pid]["total"] += gr["cells"]

    result = []
    for r in rows:
        d = dict(r)
        events = conn.execute(
            "SELECT * FROM planting_events WHERE planting_id = ? ORDER BY event_date",
            (d["id"],)
        ).fetchall()
        d["events"] = [dict(e) for e in events]
        # Compute actual germination rate from logged germination events
        germ_events = [e for e in d["events"] if e["event_type"] == "germination"]
        total_germinated = sum(e["quantity"] or 0 for e in germ_events)
        qty_started = d.get("qty_started") or 0
        d["actual_germ_count"] = total_germinated
        d["actual_germ_rate"] = round(total_germinated / qty_started * 100, 1) if qty_started > 0 else None
        photo_count = conn.execute(
            "SELECT COUNT(*) FROM photos WHERE planting_id = ?", (d["id"],)
        ).fetchone()[0]
        d["photo_count"] = photo_count
        grid_info = grid_by_planting.get(d["id"], {"structures": [], "total": 0})
        d["grid_structures"] = grid_info["structures"]   # beds/boxes where cells exist
        d["grid_cells_total"] = grid_info["total"]       # total plants physically placed
        d["placed_count"] = grid_info["total"]
        d["unplaced_count"] = max(0, (d.get("qty_started") or 0) - grid_info["total"])
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
        """INSERT INTO plantings (seed_id, structure_id, year, qty_started, qty_planted,
           indoor_start_date, hardening_date, transplant_date, direct_sow_date,
           first_harvest_date, status, notes)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        (data.seed_id, data.structure_id, data.year, data.qty_started, data.qty_planted,
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
        """INSERT INTO plantings (seed_id, structure_id, year, qty_started, qty_planted,
           indoor_start_date, hardening_date, transplant_date, direct_sow_date,
           first_harvest_date, status, notes)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        (o["seed_id"], None, o["year"], o.get("qty_started"), o.get("qty_planted"),
         o["indoor_start_date"], o["hardening_date"], o["transplant_date"],
         o["direct_sow_date"], o["first_harvest_date"], o["status"],
         o["notes"])
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return {"id": new_id, "message": "Planting duplicated"}


@app.put("/api/plantings/{planting_id}")
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
        """INSERT INTO planting_events (planting_id, event_date, event_type, details, severity, product_used, quantity)
           VALUES (?,?,?,?,?,?,?)""",
        (planting_id, data.event_date, data.event_type, data.details,
         data.severity, data.product_used, data.quantity)
    )
    conn.commit()
    event_id = cursor.lastrowid
    conn.close()
    return {"id": event_id, "message": "Event created"}


@app.put("/api/events/{event_id}")
def update_event(event_id: int, data: EventCreate):
    conn = get_db()
    conn.execute(
        """UPDATE planting_events
           SET event_date=?, event_type=?, details=?, severity=?, product_used=?, quantity=?
           WHERE id=?""",
        (data.event_date, data.event_type, data.details,
         data.severity, data.product_used, data.quantity, event_id)
    )
    conn.commit()
    conn.close()
    return {"message": "Event updated"}


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
        SELECT gc.row, gc.col, gc.planting_id, gc.plant_guid, gc.short_id,
               gc.plant_status, gc.plant_notes, gc.label_visible,
               p.seed_id, s.name as seed_name, s.short_label, s.category, s.spacing_inches
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
    # Derive seed name prefix once for this planting
    row_seed = conn.execute(
        "SELECT s.name FROM plantings p JOIN seeds s ON p.seed_id = s.id WHERE p.id = ?",
        (data.planting_id,)
    ).fetchone()
    prefix = seed_prefix(row_seed["name"]) if row_seed else "XX"

    for cell in data.cells:
        existing = conn.execute(
            "SELECT id, planting_id, plant_guid FROM grid_cells WHERE structure_id = ? AND row = ? AND col = ?",
            (structure_id, cell["row"], cell["col"])
        ).fetchone()

        if existing and existing["planting_id"] == data.planting_id:
            # Same planting repainting same cell — preserve existing identity
            continue

        # New cell or different planting taking over — assign fresh identity
        count = conn.execute(
            "SELECT COUNT(*) FROM grid_cells WHERE planting_id = ? AND plant_guid IS NOT NULL",
            (data.planting_id,)
        ).fetchone()[0]
        new_guid = str(uuid.uuid4())
        new_short = f"{prefix}-{count + 1:02d}"

        try:
            conn.execute(
                """INSERT INTO grid_cells (planting_id, structure_id, row, col, plant_guid, short_id, plant_status, label_visible)
                   VALUES (?,?,?,?,?,?,'healthy',1)
                   ON CONFLICT(structure_id, row, col) DO UPDATE SET
                       planting_id=excluded.planting_id,
                       plant_guid=excluded.plant_guid,
                       short_id=excluded.short_id,
                       plant_status='healthy',
                       plant_notes=NULL,
                       label_visible=1""",
                (data.planting_id, structure_id, cell["row"], cell["col"], new_guid, new_short)
            )
        except Exception:
            pass
    conn.commit()
    conn.close()
    return {"message": "Grid updated", "cell_count": len(data.cells)}


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


# ── Individual Plant Tracking ─────────────────────────────────────────────────

@app.get("/api/plants/{plant_guid}")
def get_plant(plant_guid: str):
    conn = get_db()
    row = conn.execute("""
        SELECT gc.id as cell_id, gc.plant_guid, gc.short_id, gc.plant_status, gc.plant_notes,
               gc.label_visible, gc.row, gc.col, gc.structure_id, gc.planting_id,
               p.seed_id, p.status as planting_status, p.notes as family_notes,
               p.transplant_date, p.direct_sow_date, p.first_harvest_date, p.year,
               s.name as seed_name, s.short_label, s.category, s.variety, s.days_to_maturity, s.image_url,
               st.name as structure_name
        FROM grid_cells gc
        JOIN plantings p ON gc.planting_id = p.id
        JOIN seeds s ON p.seed_id = s.id
        LEFT JOIN structures st ON gc.structure_id = st.id
        WHERE gc.plant_guid = ?
    """, (plant_guid,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Plant not found")
    conn.close()
    return dict(row)


@app.patch("/api/plants/{plant_guid}")
def update_plant(plant_guid: str, data: PlantUpdate):
    conn = get_db()
    existing = conn.execute("SELECT id FROM grid_cells WHERE plant_guid = ?", (plant_guid,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(404, "Plant not found")
    updates, values = [], []
    if data.plant_status is not None:
        updates.append("plant_status = ?"); values.append(data.plant_status)
    if data.plant_notes is not None:
        updates.append("plant_notes = ?"); values.append(data.plant_notes)
    if data.label_visible is not None:
        updates.append("label_visible = ?"); values.append(1 if data.label_visible else 0)
    if updates:
        values.append(plant_guid)
        conn.execute(f"UPDATE grid_cells SET {', '.join(updates)} WHERE plant_guid = ?", values)
        conn.commit()
    conn.close()
    return {"message": "Plant updated"}


@app.patch("/api/plantings/{planting_id}/family-notes")
def update_family_notes(planting_id: int, data: FamilyNotesUpdate):
    conn = get_db()
    existing = conn.execute("SELECT id FROM plantings WHERE id = ?", (planting_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(404, "Planting not found")
    conn.execute(
        "UPDATE plantings SET notes = ?, updated_at = ? WHERE id = ?",
        (data.notes, datetime.utcnow().isoformat(), planting_id)
    )
    conn.commit()
    conn.close()
    return {"message": "Family notes updated"}


# ── Plant Harvests ────────────────────────────────────────────────────────────

@app.get("/api/plants/{plant_guid}/harvests")
def list_plant_harvests(plant_guid: str):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM plant_harvests WHERE plant_guid = ? ORDER BY harvest_date DESC",
        (plant_guid,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/plants/{plant_guid}/harvests")
def create_plant_harvest(plant_guid: str, data: HarvestCreate):
    conn = get_db()
    existing = conn.execute("SELECT id FROM grid_cells WHERE plant_guid = ?", (plant_guid,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(404, "Plant not found")
    cursor = conn.execute(
        "INSERT INTO plant_harvests (plant_guid, harvest_date, weight_oz, count, notes) VALUES (?,?,?,?,?)",
        (plant_guid, data.harvest_date, data.weight_oz, data.count, data.notes)
    )
    conn.commit()
    harvest_id = cursor.lastrowid
    conn.close()
    return {"id": harvest_id, "message": "Harvest recorded"}


@app.delete("/api/plant-harvests/{harvest_id}")
def delete_plant_harvest(harvest_id: int):
    conn = get_db()
    conn.execute("DELETE FROM plant_harvests WHERE id = ?", (harvest_id,))
    conn.commit()
    conn.close()
    return {"message": "Harvest deleted"}


# ── Plant Photos ──────────────────────────────────────────────────────────────

@app.get("/api/plants/{plant_guid}/photos")
def list_plant_photos(plant_guid: str):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM photos WHERE plant_guid = ? ORDER BY taken_date",
        (plant_guid,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/plants/{plant_guid}/photos")
async def upload_plant_photo(
    plant_guid: str,
    file: UploadFile = File(...),
    caption: str = Form(""),
    taken_date: str = Form("")
):
    conn = get_db()
    cell = conn.execute(
        "SELECT planting_id FROM grid_cells WHERE plant_guid = ?", (plant_guid,)
    ).fetchone()
    if not cell:
        conn.close()
        raise HTTPException(404, "Plant not found")
    planting_id = cell["planting_id"]
    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ".jpg"
    if ext not in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
        ext = '.jpg'
    filename = f"plant_{plant_guid[:8]}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(PHOTOS_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(await file.read())
    if not taken_date:
        taken_date = datetime.utcnow().strftime("%Y-%m-%d")
    cursor = conn.execute(
        "INSERT INTO photos (planting_id, plant_guid, filename, original_name, caption, taken_date) VALUES (?,?,?,?,?,?)",
        (planting_id, plant_guid, filename, file.filename, caption, taken_date)
    )
    conn.commit()
    photo_id = cursor.lastrowid
    conn.close()
    return {"id": photo_id, "filename": filename, "message": "Photo uploaded"}


# ── Seed Image Upload ─────────────────────────────────────────────────────────

@app.post("/api/seeds/{seed_id}/image")
async def upload_seed_image(seed_id: str, file: UploadFile = File(...)):
    conn = get_db()
    existing = conn.execute("SELECT id FROM seeds WHERE id = ?", (seed_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(404, "Seed not found")
    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ".jpg"
    if ext not in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
        ext = '.jpg'
    filename = f"seed_{seed_id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(PHOTOS_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(await file.read())
    image_url = f"/photos/{filename}"
    conn.execute("UPDATE seeds SET image_url = ? WHERE id = ?", (image_url, seed_id))
    conn.commit()
    conn.close()
    return {"image_url": image_url}


class ImageUrlPatch(BaseModel):
    image_url: Optional[str] = None


@app.patch("/api/seeds/{seed_id}/image")
def patch_seed_image_url(seed_id: str, data: ImageUrlPatch):
    conn = get_db()
    conn.execute("UPDATE seeds SET image_url = ? WHERE id = ?", (data.image_url, seed_id))
    conn.commit()
    conn.close()
    return {"image_url": data.image_url}


# ── Photos ────────────────────────────────────────────────────────────────────

@app.post("/api/plantings/{planting_id}/photos")
async def upload_photo(
    planting_id: int,
    file: UploadFile = File(...),
    caption: str = Form(""),
    taken_date: str = Form(""),
    event_id: str = Form("")
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

    ev_id = int(event_id) if event_id.strip().isdigit() else None

    cursor = conn.execute(
        """INSERT INTO photos (planting_id, filename, original_name, caption, taken_date, event_id)
           VALUES (?,?,?,?,?,?)""",
        (planting_id, filename, file.filename, caption, taken_date, ev_id)
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


@app.get("/api/photos")
def list_all_photos():
    conn = get_db()
    rows = conn.execute("""
        SELECT p.id, p.planting_id, p.plant_guid, p.filename, p.original_name,
               p.caption, p.taken_date, p.event_id, p.created_at,
               s.name AS seed_name, s.category
        FROM photos p
        LEFT JOIN plantings pl ON p.planting_id = pl.id
        LEFT JOIN seeds s ON pl.seed_id = s.id
        ORDER BY COALESCE(p.taken_date, '0000-00-00') DESC, p.created_at DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/dashboard/activity")
def dashboard_activity():
    conn = get_db()
    events = conn.execute("""
        SELECT e.id, e.planting_id, e.event_type, e.event_date, e.details,
               s.name AS seed_name, s.category
        FROM planting_events e
        LEFT JOIN plantings pl ON e.planting_id = pl.id
        LEFT JOIN seeds s ON pl.seed_id = s.id
        ORDER BY e.event_date DESC, e.id DESC
        LIMIT 20
    """).fetchall()
    conn.close()
    return [dict(r) for r in events]


# ── Label Positions ───────────────────────────────────────────────────────────

@app.get("/api/label-positions")
def get_label_positions():
    conn = get_db()
    rows = conn.execute("SELECT entity_type, entity_id, label_x, label_y FROM label_positions").fetchall()
    conn.close()
    return [dict(r) for r in rows]


class LabelPosition(BaseModel):
    entity_type: str
    entity_id: str
    label_x: float
    label_y: float
    orientation: str = 'horizontal'
    hidden: bool = False
    label_text: Optional[str] = None


@app.put("/api/label-positions")
def save_label_positions(positions: List[LabelPosition]):
    conn = get_db()
    for pos in positions:
        conn.execute("""
            INSERT INTO label_positions (entity_type, entity_id, label_x, label_y, orientation, hidden, label_text)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (entity_type, entity_id) DO UPDATE SET
                label_x=excluded.label_x, label_y=excluded.label_y,
                orientation=excluded.orientation, hidden=excluded.hidden,
                label_text=excluded.label_text
        """, (pos.entity_type, pos.entity_id, pos.label_x, pos.label_y, pos.orientation, int(pos.hidden), pos.label_text))
    conn.commit()
    conn.close()
    return {"message": "Saved"}


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
        "plant_harvests": [dict(r) for r in conn.execute("SELECT * FROM plant_harvests").fetchall()],
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
        DELETE FROM plant_harvests;
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
               details, severity, product_used, quantity, created_at)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (e["id"], e["planting_id"], e["event_date"], e["event_type"],
             e.get("details"), e.get("severity"), e.get("product_used"),
             e.get("quantity"), e.get("created_at"))
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
            """INSERT INTO grid_cells (id, planting_id, structure_id, row, col,
               plant_guid, short_id, plant_status, plant_notes, label_visible)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (gc["id"], gc["planting_id"], gc["structure_id"], gc["row"], gc["col"],
             gc.get("plant_guid"), gc.get("short_id"),
             gc.get("plant_status", "healthy"), gc.get("plant_notes"),
             gc.get("label_visible", 1))
        )

    for h in data.get("plant_harvests", []):
        conn.execute(
            """INSERT INTO plant_harvests (id, plant_guid, harvest_date, weight_oz, count, notes, created_at)
               VALUES (?,?,?,?,?,?,?)""",
            (h["id"], h["plant_guid"], h["harvest_date"], h.get("weight_oz"),
             h.get("count"), h.get("notes"), h.get("created_at"))
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
