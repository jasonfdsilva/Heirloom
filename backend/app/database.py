import os
import sqlite3
import uuid
from typing import Generator

DB_PATH = os.getenv("DATABASE_URL", "sqlite:////app/data/heirloom.db").replace("sqlite:///", "")
PHOTOS_DIR = os.getenv("PHOTOS_DIR", "/app/photos")

os.makedirs(os.path.dirname(DB_PATH) if os.path.dirname(DB_PATH) else ".", exist_ok=True)
os.makedirs(PHOTOS_DIR, exist_ok=True)


def get_db() -> Generator[sqlite3.Connection, None, None]:
    """FastAPI dependency that yields a database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
    finally:
        conn.close()


def _raw_conn() -> sqlite3.Connection:
    """Direct connection for startup tasks (init_db, migrate_db)."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def seed_prefix(seed_name: str) -> str:
    """Derive a 2-char prefix from a seed name. e.g. 'Shishito' → 'SH', 'Sun Sugar' → 'SS'."""
    words = seed_name.split()
    if len(words) == 1:
        return words[0][:2].upper()
    return (words[0][0] + words[1][0]).upper()


def init_db() -> None:
    conn = _raw_conn()
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

    # Idempotent column migrations
    try:
        conn.execute("ALTER TABLE planting_events ADD COLUMN quantity INTEGER")
    except Exception:
        pass
    try:
        conn.execute("ALTER TABLE photos ADD COLUMN event_id INTEGER REFERENCES planting_events(id)")
    except Exception:
        pass

    conn.commit()
    conn.close()


def migrate_db() -> None:
    """Add new columns to existing databases without losing data."""
    conn = _raw_conn()

    planting_cols = [row[1] for row in conn.execute("PRAGMA table_info(plantings)").fetchall()]
    if "qty_started" not in planting_cols:
        conn.execute("ALTER TABLE plantings ADD COLUMN qty_started INTEGER")
        conn.execute("UPDATE plantings SET qty_started = quantity WHERE quantity IS NOT NULL")
    if "qty_planted" not in planting_cols:
        conn.execute("ALTER TABLE plantings ADD COLUMN qty_planted INTEGER")

    seed_cols = [row[1] for row in conn.execute("PRAGMA table_info(seeds)").fetchall()]
    if "image_url" not in seed_cols:
        conn.execute("ALTER TABLE seeds ADD COLUMN image_url TEXT")
    if "short_label" not in seed_cols:
        conn.execute("ALTER TABLE seeds ADD COLUMN short_label TEXT")

    lp_cols = [row[1] for row in conn.execute("PRAGMA table_info(label_positions)").fetchall()]
    if "orientation" not in lp_cols:
        conn.execute("ALTER TABLE label_positions ADD COLUMN orientation TEXT DEFAULT 'horizontal'")
    if "hidden" not in lp_cols:
        conn.execute("ALTER TABLE label_positions ADD COLUMN hidden INTEGER DEFAULT 0")
    if "label_text" not in lp_cols:
        conn.execute("ALTER TABLE label_positions ADD COLUMN label_text TEXT")

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

    photo_cols = [row[1] for row in conn.execute("PRAGMA table_info(photos)").fetchall()]
    if "plant_guid" not in photo_cols:
        conn.execute("ALTER TABLE photos ADD COLUMN plant_guid TEXT")

    conn.commit()

    # Backfill grid cells that have no plant_guid
    cells_to_fill = conn.execute(
        "SELECT id, planting_id FROM grid_cells WHERE plant_guid IS NULL ORDER BY planting_id, id"
    ).fetchall()

    if cells_to_fill:
        prefix_cache: dict = {}
        counter: dict = {}

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
