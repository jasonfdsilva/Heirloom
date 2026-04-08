import os
import sqlite3
import uuid
from typing import Generator

DB_PATH = os.getenv("DATABASE_URL", "sqlite:////app/data/heirloom.db").replace("sqlite:///", "")
PHOTOS_DIR = os.getenv("PHOTOS_DIR", "/app/photos")

try:
    os.makedirs(os.path.dirname(DB_PATH) if os.path.dirname(DB_PATH) else ".", exist_ok=True)
    os.makedirs(PHOTOS_DIR, exist_ok=True)  # pragma: no cover
except OSError:
    pass  # Read-only filesystem in test/CI environments — paths created by Docker in prod


def get_db() -> Generator[sqlite3.Connection, None, None]:
    """FastAPI dependency that yields a database connection."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
    finally:
        conn.close()


def _raw_conn() -> sqlite3.Connection:
    """Direct connection for startup tasks (init_db, migrate_db)."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
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


def lot_prefix(seed_name: str) -> str:
    """Derive a lot code prefix from a seed name (up to 4 significant words, uppercase initials).

    Stop-words are skipped: OG, F1, Hybrid, Mix, Heirloom.
    Single-word names return first 2 chars. Multi-word names return initials (up to 4).

    Examples:
        'Cherokee Purple Tomato OG' → 'CPT'
        'Sun Gold F1'               → 'SG'
        'Shishito'                  → 'SH'
    """
    _stop = {"OG", "F1", "Hybrid", "Mix", "Heirloom"}
    words = [w for w in seed_name.split() if w not in _stop]
    if not words:
        return seed_name[:2].upper()
    if len(words) == 1:
        return words[0][:2].upper()
    return "".join(w[0] for w in words[:4]).upper()


def init_db() -> None:  # pragma: no cover
    conn = _raw_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS seeds (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            variety TEXT,
            category TEXT NOT NULL,
            common_name TEXT,
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
            method TEXT DEFAULT 'indoors',
            purchased_date TEXT,
            planted_out_date TEXT,
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
            quantity INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            planting_id INTEGER NOT NULL REFERENCES plantings(id) ON DELETE CASCADE,
            filename TEXT NOT NULL,
            original_name TEXT,
            caption TEXT,
            taken_date TEXT,
            event_id INTEGER REFERENCES planting_events(id),
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

        CREATE TABLE IF NOT EXISTS seed_lots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seed_id TEXT NOT NULL REFERENCES seeds(id) ON DELETE CASCADE,
            lot_code TEXT UNIQUE NOT NULL,
            packed_for_year INTEGER,
            purchased_year INTEGER,
            supplier TEXT,
            supplier_lot TEXT,
            sku TEXT,
            germ_rate REAL,
            notes TEXT,
            packet_image_url TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_seed_lots_seed_id ON seed_lots (seed_id);
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


# ── Schema migration registry ──────────────────────────────────────────────────
#
# Each migration has a version number, a description, an `up` function (apply)
# and a `down` function (reverse).  migrate_db() uses PRAGMA user_version to
# track which migrations have been applied and runs only unapplied ones.
# downgrade_db(steps) reverses the last N applied migrations.
#
# SQLite 3.35+ is required for DROP COLUMN support in down migrations.


def _cols(conn: sqlite3.Connection, table: str) -> set:
    return {r[1] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()}


def _drop_col(conn: sqlite3.Connection, table: str, col: str) -> None:
    """DROP COLUMN only if the column currently exists (idempotent)."""
    if col in _cols(conn, table):
        conn.execute(f"ALTER TABLE {table} DROP COLUMN {col}")


def _m1_up(conn: sqlite3.Connection) -> None:
    """Add columns introduced in the first app generation; rename germination events;
    backfill plant_guid / short_id on existing grid cells."""
    # plantings
    pc = _cols(conn, "plantings")
    if "qty_started" not in pc:
        conn.execute("ALTER TABLE plantings ADD COLUMN qty_started INTEGER")
        conn.execute("UPDATE plantings SET qty_started = quantity WHERE quantity IS NOT NULL")
    if "qty_planted" not in pc:
        conn.execute("ALTER TABLE plantings ADD COLUMN qty_planted INTEGER")
    if "seed_lot_id" not in pc:
        conn.execute("ALTER TABLE plantings ADD COLUMN seed_lot_id INTEGER REFERENCES seed_lots(id)")
    if "method" not in pc:
        conn.execute("ALTER TABLE plantings ADD COLUMN method TEXT DEFAULT 'indoors'")
        if "direct_sow_date" in _cols(conn, "plantings"):
            conn.execute("UPDATE plantings SET method = 'direct' WHERE direct_sow_date IS NOT NULL")
    if "purchased_date" not in pc:
        conn.execute("ALTER TABLE plantings ADD COLUMN purchased_date TEXT")
    if "planted_out_date" not in pc:
        conn.execute("ALTER TABLE plantings ADD COLUMN planted_out_date TEXT")
    # seeds
    sc = _cols(conn, "seeds")
    if "image_url" not in sc:
        conn.execute("ALTER TABLE seeds ADD COLUMN image_url TEXT")
    if "short_label" not in sc:
        conn.execute("ALTER TABLE seeds ADD COLUMN short_label TEXT")
    if "common_name" not in sc:
        conn.execute("ALTER TABLE seeds ADD COLUMN common_name TEXT")
    if "image_locked" not in sc:
        conn.execute("ALTER TABLE seeds ADD COLUMN image_locked INTEGER DEFAULT 0")
    # label_positions
    lc = _cols(conn, "label_positions")
    if "orientation" not in lc:
        conn.execute("ALTER TABLE label_positions ADD COLUMN orientation TEXT DEFAULT 'horizontal'")
    if "hidden" not in lc:
        conn.execute("ALTER TABLE label_positions ADD COLUMN hidden INTEGER DEFAULT 0")
    if "label_text" not in lc:
        conn.execute("ALTER TABLE label_positions ADD COLUMN label_text TEXT")
    # grid_cells
    gc = _cols(conn, "grid_cells")
    if "plant_guid" not in gc:
        conn.execute("ALTER TABLE grid_cells ADD COLUMN plant_guid TEXT")
    if "short_id" not in gc:
        conn.execute("ALTER TABLE grid_cells ADD COLUMN short_id TEXT")
    if "plant_status" not in gc:
        conn.execute("ALTER TABLE grid_cells ADD COLUMN plant_status TEXT DEFAULT 'healthy'")
    if "plant_notes" not in gc:
        conn.execute("ALTER TABLE grid_cells ADD COLUMN plant_notes TEXT")
    if "label_visible" not in gc:
        conn.execute("ALTER TABLE grid_cells ADD COLUMN label_visible INTEGER DEFAULT 1")
    # planting_events
    pec = _cols(conn, "planting_events")
    if "quantity" not in pec:
        conn.execute("ALTER TABLE planting_events ADD COLUMN quantity INTEGER")
    # photos
    phc = _cols(conn, "photos")
    if "plant_guid" not in phc:
        conn.execute("ALTER TABLE photos ADD COLUMN plant_guid TEXT")
    if "event_id" not in phc:
        conn.execute("ALTER TABLE photos ADD COLUMN event_id INTEGER REFERENCES planting_events(id)")
    # rename germination → germinated (idempotent)
    conn.execute(
        "UPDATE planting_events SET event_type = 'germinated' WHERE event_type = 'germination'"
    )
    # backfill plant_guid / short_id on existing grid cells
    cells = conn.execute(
        "SELECT id, planting_id FROM grid_cells WHERE plant_guid IS NULL ORDER BY planting_id, id"
    ).fetchall()
    if cells:
        prefix_cache: dict = {}
        counter: dict = {}
        for row in conn.execute(
            "SELECT planting_id, short_id FROM grid_cells WHERE short_id IS NOT NULL"
        ).fetchall():
            pid, sid = row["planting_id"], row["short_id"]
            if sid:
                try:
                    counter[pid] = max(counter.get(pid, 0), int(sid.split("-")[-1]))
                except ValueError:
                    pass
        for c in cells:
            pid = c["planting_id"]
            if pid not in prefix_cache:
                r = conn.execute(
                    "SELECT s.name FROM plantings p JOIN seeds s ON p.seed_id = s.id WHERE p.id = ?",
                    (pid,),
                ).fetchone()
                prefix_cache[pid] = seed_prefix(r["name"]) if r else "XX"
            counter[pid] = counter.get(pid, 0) + 1
            conn.execute(
                "UPDATE grid_cells SET plant_guid = ?, short_id = ? WHERE id = ?",
                (str(uuid.uuid4()), f"{prefix_cache[pid]}-{counter[pid]:02d}", c["id"]),
            )


def _m1_down(conn: sqlite3.Connection) -> None:
    """Reverse Migration 1: undo germination rename and drop all added columns.
    Note: plant_guid backfill data is not restored (one-way data migration).
    Requires SQLite 3.35+."""
    conn.execute(
        "UPDATE planting_events SET event_type = 'germination' WHERE event_type = 'germinated'"
    )
    for col in ("qty_started", "qty_planted", "seed_lot_id", "method", "purchased_date", "planted_out_date"):
        _drop_col(conn, "plantings", col)
    for col in ("image_url", "short_label", "common_name", "image_locked"):
        _drop_col(conn, "seeds", col)
    for col in ("orientation", "hidden", "label_text"):
        _drop_col(conn, "label_positions", col)
    for col in ("plant_guid", "short_id", "plant_status", "plant_notes", "label_visible"):
        _drop_col(conn, "grid_cells", col)
    for col in ("plant_guid", "event_id"):
        _drop_col(conn, "photos", col)
    _drop_col(conn, "planting_events", "quantity")


class _Migration:
    __slots__ = ("version", "description", "up", "down")

    def __init__(self, version: int, description: str, up, down) -> None:
        self.version = version
        self.description = description
        self.up = up
        self.down = down


_MIGRATIONS: list[_Migration] = [
    _Migration(
        version=1,
        description=(
            "Add columns: plantings (qty_started, qty_planted, seed_lot_id, method, "
            "purchased_date, planted_out_date), seeds (image_url, short_label, common_name, "
            "image_locked), label_positions (orientation, hidden, label_text), grid_cells "
            "(plant_guid, short_id, plant_status, plant_notes, label_visible), photos "
            "(plant_guid, event_id), planting_events (quantity); "
            "rename germination→germinated events; backfill plant_guid"
        ),
        up=_m1_up,
        down=_m1_down,
    ),
]


def _migration_conn() -> sqlite3.Connection:
    """Connection for migrate_db / downgrade_db.  isolation_level=None gives full
    manual transaction control so DDL statements are not auto-committed by Python."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def migrate_db() -> None:
    """Apply all pending schema migrations in version order.

    Each migration runs inside an explicit transaction.  On failure the
    transaction is rolled back and a RuntimeError is raised — the database is
    left in the state it was in before that migration started.

    Implementation note: with isolation_level=None (our _migration_conn), Python's
    sqlite3 does not auto-commit before DDL. SQLite treats ALTER TABLE and PRAGMA
    user_version as transactional — both are rolled back on ROLLBACK. PRAGMA
    user_version is updated inside the transaction so a rollback also reverts the
    version number, keeping schema state and version counter always in sync.
    """
    conn = _migration_conn()
    try:
        current_version: int = conn.execute("PRAGMA user_version").fetchone()[0]
        for m in _MIGRATIONS:
            if m.version <= current_version:
                continue
            try:
                conn.execute("BEGIN")
                m.up(conn)
                conn.execute(f"PRAGMA user_version = {m.version}")
                conn.execute("COMMIT")
            except Exception as exc:
                conn.execute("ROLLBACK")
                raise RuntimeError(
                    f"Migration {m.version} ({m.description!r}) failed — rolled back: {exc}"
                ) from exc
    finally:
        conn.close()


def downgrade_db(steps: int = 1) -> None:
    """Reverse the last `steps` applied migrations.

    Each migration is reversed inside an explicit transaction.  On failure the
    transaction is rolled back and a RuntimeError is raised.

    Raises ValueError if steps < 1 or if steps exceeds the number of applied migrations.
    """
    if steps < 1:
        raise ValueError("steps must be >= 1")
    conn = _migration_conn()
    try:
        current_version: int = conn.execute("PRAGMA user_version").fetchone()[0]
        to_reverse = [m for m in _MIGRATIONS if m.version <= current_version]
        if not to_reverse:
            return  # nothing applied yet
        if steps > len(to_reverse):
            raise ValueError(
                f"Cannot downgrade {steps} step(s): only {len(to_reverse)} migration(s) applied"
            )
        for m in reversed(to_reverse[-steps:]):
            try:
                conn.execute("BEGIN")
                m.down(conn)
                conn.execute(f"PRAGMA user_version = {m.version - 1}")
                conn.execute("COMMIT")
            except Exception as exc:
                conn.execute("ROLLBACK")
                raise RuntimeError(
                    f"Downgrade of migration {m.version} ({m.description!r}) failed — rolled back: {exc}"
                ) from exc
    finally:
        conn.close()
