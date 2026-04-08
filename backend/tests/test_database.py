"""Unit tests for database.py helpers not exercised by API tests."""

import sqlite3

import pytest

import backend.app.database as database_module
from backend.app.database import seed_prefix, lot_prefix


# ── seed_prefix ───────────────────────────────────────────────────────────────

def test_seed_prefix_single_word():
    """Single-word name returns first 2 chars uppercased."""
    assert seed_prefix("Shishito") == "SH"


def test_seed_prefix_multi_word():
    assert seed_prefix("Sun Gold") == "SG"


# ── lot_prefix ────────────────────────────────────────────────────────────────

def test_lot_prefix_all_stop_words():
    """When every word is a stop-word, falls back to first 2 chars of the full name."""
    assert lot_prefix("OG") == "OG"


def test_lot_prefix_empty_after_filtering():
    """'F1 OG' — both words filtered → fallback to seed_name[:2]."""
    result = lot_prefix("F1 OG")
    assert result == "F1"


# ── get_db ────────────────────────────────────────────────────────────────────

def test_get_db_yields_connection(tmp_path, monkeypatch):
    """get_db yields a live sqlite3.Connection and closes it on cleanup."""
    import sqlite3
    db_file = str(tmp_path / "test.db")
    monkeypatch.setattr(database_module, "DB_PATH", db_file)
    gen = database_module.get_db()
    conn = next(gen)
    assert conn is not None
    assert isinstance(conn, sqlite3.Connection)
    # Drive the generator to completion (triggers conn.close())
    try:
        next(gen)
    except StopIteration:
        pass


# ── _raw_conn ─────────────────────────────────────────────────────────────────

def test_raw_conn_returns_connection(tmp_path, monkeypatch):
    """_raw_conn returns a configured sqlite3.Connection."""
    db_file = str(tmp_path / "raw_test.db")
    monkeypatch.setattr(database_module, "DB_PATH", db_file)
    conn = database_module._raw_conn()
    assert conn is not None
    assert isinstance(conn, sqlite3.Connection)
    conn.close()


# ── migration helpers ─────────────────────────────────────────────────────────

def _make_pre_migration_db(path: str) -> sqlite3.Connection:
    """Create a minimal DB with the base schema (no migrated columns) and return it."""
    conn = sqlite3.connect(path, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.executescript("""
        CREATE TABLE seeds (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            variety TEXT,
            category TEXT NOT NULL
        );
        CREATE TABLE structures (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            width REAL NOT NULL,
            length REAL NOT NULL
        );
        CREATE TABLE plantings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seed_id TEXT NOT NULL REFERENCES seeds(id),
            year INTEGER DEFAULT 2026,
            quantity INTEGER
        );
        CREATE TABLE grid_cells (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            planting_id INTEGER NOT NULL REFERENCES plantings(id),
            structure_id TEXT NOT NULL,
            row INTEGER NOT NULL,
            col INTEGER NOT NULL
        );
        CREATE TABLE planting_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            planting_id INTEGER NOT NULL,
            event_date TEXT NOT NULL,
            event_type TEXT NOT NULL
        );
        CREATE TABLE photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            planting_id INTEGER NOT NULL,
            filename TEXT NOT NULL
        );
        CREATE TABLE label_positions (
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            label_x REAL,
            label_y REAL,
            PRIMARY KEY (entity_type, entity_id)
        );
        CREATE TABLE seed_lots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seed_id TEXT NOT NULL,
            lot_code TEXT UNIQUE NOT NULL,
            packed_for_year INTEGER
        );
    """)
    return conn


# ── migrate_db ────────────────────────────────────────────────────────────────

def test_migrate_db_advances_user_version(tmp_path, monkeypatch):
    """After migrate_db, PRAGMA user_version equals the latest migration version."""
    db_file = str(tmp_path / "test.db")
    _make_pre_migration_db(db_file).close()
    monkeypatch.setattr(database_module, "DB_PATH", db_file)

    database_module.migrate_db()

    conn = sqlite3.connect(db_file)
    version = conn.execute("PRAGMA user_version").fetchone()[0]
    conn.close()
    assert version == database_module._MIGRATIONS[-1].version


def test_migrate_db_adds_expected_columns(tmp_path, monkeypatch):
    """migrate_db adds all columns defined in Migration 1."""
    db_file = str(tmp_path / "test.db")
    _make_pre_migration_db(db_file).close()
    monkeypatch.setattr(database_module, "DB_PATH", db_file)

    database_module.migrate_db()

    conn = sqlite3.connect(db_file)
    planting_cols = {r[1] for r in conn.execute("PRAGMA table_info(plantings)").fetchall()}
    seed_cols = {r[1] for r in conn.execute("PRAGMA table_info(seeds)").fetchall()}
    gc_cols = {r[1] for r in conn.execute("PRAGMA table_info(grid_cells)").fetchall()}
    conn.close()

    assert "qty_started" in planting_cols
    assert "qty_planted" in planting_cols
    assert "seed_lot_id" in planting_cols
    assert "method" in planting_cols
    assert "image_url" in seed_cols
    assert "common_name" in seed_cols
    assert "plant_guid" in gc_cols
    assert "plant_status" in gc_cols


def test_migrate_db_is_idempotent(tmp_path, monkeypatch):
    """Running migrate_db twice leaves user_version unchanged on the second run."""
    db_file = str(tmp_path / "test.db")
    _make_pre_migration_db(db_file).close()
    monkeypatch.setattr(database_module, "DB_PATH", db_file)

    database_module.migrate_db()
    database_module.migrate_db()  # second run — no error, same version

    conn = sqlite3.connect(db_file)
    version = conn.execute("PRAGMA user_version").fetchone()[0]
    conn.close()
    assert version == database_module._MIGRATIONS[-1].version


def test_migrate_db_skips_already_applied_migrations(tmp_path, monkeypatch):
    """If user_version already equals the latest, migrate_db is a no-op."""
    db_file = str(tmp_path / "test.db")
    pre = _make_pre_migration_db(db_file)
    latest = database_module._MIGRATIONS[-1].version
    pre.execute(f"PRAGMA user_version = {latest}")
    pre.close()
    monkeypatch.setattr(database_module, "DB_PATH", db_file)

    database_module.migrate_db()

    conn = sqlite3.connect(db_file)
    version = conn.execute("PRAGMA user_version").fetchone()[0]
    # Columns should NOT have been added (migration was skipped)
    planting_cols = {r[1] for r in conn.execute("PRAGMA table_info(plantings)").fetchall()}
    conn.close()
    assert version == latest
    assert "qty_started" not in planting_cols  # migration was skipped


def test_migrate_db_rolls_back_on_failure(tmp_path, monkeypatch):
    """If a migration's up() raises, the transaction is rolled back and
    user_version is not advanced."""
    db_file = str(tmp_path / "test.db")
    _make_pre_migration_db(db_file).close()
    monkeypatch.setattr(database_module, "DB_PATH", db_file)

    # Patch Migration 1's up to always raise
    original_up = database_module._MIGRATIONS[0].up
    database_module._MIGRATIONS[0].up = lambda conn: (_ for _ in ()).throw(
        RuntimeError("intentional failure")
    )
    try:
        with pytest.raises(RuntimeError, match="Migration 1"):
            database_module.migrate_db()
    finally:
        database_module._MIGRATIONS[0].up = original_up

    conn = sqlite3.connect(db_file)
    version = conn.execute("PRAGMA user_version").fetchone()[0]
    planting_cols = {r[1] for r in conn.execute("PRAGMA table_info(plantings)").fetchall()}
    conn.close()
    assert version == 0  # not advanced
    assert "qty_started" not in planting_cols  # rolled back


# ── downgrade_db ──────────────────────────────────────────────────────────────

def test_downgrade_db_reverses_migration(tmp_path, monkeypatch):
    """After migrate then downgrade, added columns are gone and user_version is 0."""
    db_file = str(tmp_path / "test.db")
    _make_pre_migration_db(db_file).close()
    monkeypatch.setattr(database_module, "DB_PATH", db_file)

    database_module.migrate_db()
    database_module.downgrade_db(steps=1)

    conn = sqlite3.connect(db_file)
    version = conn.execute("PRAGMA user_version").fetchone()[0]
    planting_cols = {r[1] for r in conn.execute("PRAGMA table_info(plantings)").fetchall()}
    seed_cols = {r[1] for r in conn.execute("PRAGMA table_info(seeds)").fetchall()}
    conn.close()

    assert version == 0
    assert "qty_started" not in planting_cols
    assert "image_url" not in seed_cols


def test_downgrade_db_on_fresh_db_is_noop(tmp_path, monkeypatch):
    """Calling downgrade_db when no migrations are applied is a safe no-op."""
    db_file = str(tmp_path / "test.db")
    _make_pre_migration_db(db_file).close()
    monkeypatch.setattr(database_module, "DB_PATH", db_file)

    database_module.downgrade_db(steps=1)  # should not raise

    conn = sqlite3.connect(db_file)
    version = conn.execute("PRAGMA user_version").fetchone()[0]
    conn.close()
    assert version == 0


def test_downgrade_db_invalid_steps_raises(tmp_path, monkeypatch):
    """downgrade_db(steps=0) raises ValueError."""
    db_file = str(tmp_path / "test.db")
    monkeypatch.setattr(database_module, "DB_PATH", db_file)
    with pytest.raises(ValueError, match="steps"):
        database_module.downgrade_db(steps=0)


def test_downgrade_db_steps_exceeds_applied_raises(tmp_path, monkeypatch):
    """downgrade_db(steps=N) where N > applied migrations raises ValueError."""
    db_file = str(tmp_path / "test.db")
    _make_pre_migration_db(db_file).close()
    monkeypatch.setattr(database_module, "DB_PATH", db_file)
    database_module.migrate_db()  # applies 1 migration

    with pytest.raises(ValueError, match="Cannot downgrade 5"):
        database_module.downgrade_db(steps=5)


def test_downgrade_db_rolls_back_on_failure(tmp_path, monkeypatch):
    """If a migration's down() raises, the transaction is rolled back and
    user_version is not decremented."""
    db_file = str(tmp_path / "test.db")
    _make_pre_migration_db(db_file).close()
    monkeypatch.setattr(database_module, "DB_PATH", db_file)

    database_module.migrate_db()

    original_down = database_module._MIGRATIONS[0].down
    database_module._MIGRATIONS[0].down = lambda conn: (_ for _ in ()).throw(
        RuntimeError("intentional down failure")
    )
    try:
        with pytest.raises(RuntimeError, match="Downgrade of migration 1"):
            database_module.downgrade_db(steps=1)
    finally:
        database_module._MIGRATIONS[0].down = original_down

    conn = sqlite3.connect(db_file)
    version = conn.execute("PRAGMA user_version").fetchone()[0]
    conn.close()
    assert version == 1  # not decremented


# ── migrate_db on already-migrated DB ────────────────────────────────────────

def test_migrate_db_backfills_plant_guid_on_existing_cells(tmp_path, monkeypatch):
    """Grid cells that exist before migration get plant_guid and short_id assigned."""
    db_file = str(tmp_path / "test.db")
    pre = _make_pre_migration_db(db_file)
    # Insert seed, planting, and grid cells without plant_guid
    pre.execute("INSERT INTO seeds (id, name, category) VALUES ('tomato', 'Sun Gold', 'Tomatoes')")
    pre.execute("INSERT INTO structures (id, name, type, width, length) VALUES ('bed1', 'Bed 1', 'raised_bed', 4, 8)")
    pre.execute("INSERT INTO plantings (seed_id, year) VALUES ('tomato', 2026)")
    pid = pre.execute("SELECT last_insert_rowid()").fetchone()[0]
    pre.execute("INSERT INTO grid_cells (planting_id, structure_id, row, col) VALUES (?, 'bed1', 0, 0)", (pid,))
    pre.execute("INSERT INTO grid_cells (planting_id, structure_id, row, col) VALUES (?, 'bed1', 0, 1)", (pid,))
    pre.close()
    monkeypatch.setattr(database_module, "DB_PATH", db_file)

    database_module.migrate_db()

    conn = sqlite3.connect(db_file)
    cells = conn.execute("SELECT plant_guid, short_id FROM grid_cells").fetchall()
    conn.close()

    assert all(c[0] is not None for c in cells), "All cells should have plant_guid"
    assert all(c[1] is not None for c in cells), "All cells should have short_id"
    assert cells[0][1] != cells[1][1], "Each cell should get a unique short_id"


def test_migrate_db_direct_sow_date_backfill(tmp_path, monkeypatch):
    """Plantings with direct_sow_date get method='direct' after migration."""
    db_file = str(tmp_path / "test.db")
    pre = _make_pre_migration_db(db_file)
    # Add direct_sow_date to the pre-migration schema
    pre.execute("ALTER TABLE plantings ADD COLUMN direct_sow_date TEXT")
    pre.execute("INSERT INTO seeds (id, name, category) VALUES ('radish', 'Cherry Belle', 'Root Vegetables')")
    pre.execute("INSERT INTO plantings (seed_id, year, direct_sow_date) VALUES ('radish', 2026, '2026-05-01')")
    pre.execute("INSERT INTO plantings (seed_id, year) VALUES ('radish', 2026)")  # no direct_sow_date
    pre.close()
    monkeypatch.setattr(database_module, "DB_PATH", db_file)

    database_module.migrate_db()

    conn = sqlite3.connect(db_file)
    methods = [r[0] for r in conn.execute("SELECT method FROM plantings ORDER BY id").fetchall()]
    conn.close()
    assert methods[0] == "direct"   # had direct_sow_date
    assert methods[1] == "indoors"  # DEFAULT applied


def test_migrate_db_backfill_handles_non_numeric_short_id(tmp_path, monkeypatch):
    """Backfill tolerates existing short_ids whose suffix is not a valid integer."""
    db_file = str(tmp_path / "test.db")
    pre = _make_pre_migration_db(db_file)
    # Add grid_cell columns manually so we can insert a malformed short_id
    for sql in (
        "ALTER TABLE plantings ADD COLUMN qty_started INTEGER",
        "ALTER TABLE plantings ADD COLUMN qty_planted INTEGER",
        "ALTER TABLE plantings ADD COLUMN seed_lot_id INTEGER",
        "ALTER TABLE plantings ADD COLUMN method TEXT",
        "ALTER TABLE plantings ADD COLUMN purchased_date TEXT",
        "ALTER TABLE plantings ADD COLUMN planted_out_date TEXT",
        "ALTER TABLE seeds ADD COLUMN image_url TEXT",
        "ALTER TABLE seeds ADD COLUMN short_label TEXT",
        "ALTER TABLE seeds ADD COLUMN common_name TEXT",
        "ALTER TABLE seeds ADD COLUMN image_locked INTEGER",
        "ALTER TABLE label_positions ADD COLUMN orientation TEXT",
        "ALTER TABLE label_positions ADD COLUMN hidden INTEGER",
        "ALTER TABLE label_positions ADD COLUMN label_text TEXT",
        "ALTER TABLE grid_cells ADD COLUMN plant_guid TEXT",
        "ALTER TABLE grid_cells ADD COLUMN short_id TEXT",
        "ALTER TABLE grid_cells ADD COLUMN plant_status TEXT",
        "ALTER TABLE grid_cells ADD COLUMN plant_notes TEXT",
        "ALTER TABLE grid_cells ADD COLUMN label_visible INTEGER",
        "ALTER TABLE photos ADD COLUMN plant_guid TEXT",
    ):
        pre.execute(sql)
    pre.execute("INSERT INTO seeds (id, name, category) VALUES ('lettuce', 'Buttercrunch', 'Greens')")
    pre.execute("INSERT INTO structures (id, name, type, width, length) VALUES ('bed1', 'Bed 1', 'raised_bed', 4, 8)")
    pre.execute("INSERT INTO plantings (seed_id, year) VALUES ('lettuce', 2026)")
    pid = pre.execute("SELECT last_insert_rowid()").fetchone()[0]
    # One cell already has a malformed short_id (non-numeric suffix) — should not crash
    pre.execute(
        "INSERT INTO grid_cells (planting_id, structure_id, row, col, short_id) VALUES (?, 'bed1', 0, 0, 'BU-XX')",
        (pid,),
    )
    # Another cell needs backfill
    pre.execute(
        "INSERT INTO grid_cells (planting_id, structure_id, row, col) VALUES (?, 'bed1', 0, 1)",
        (pid,),
    )
    pre.close()
    monkeypatch.setattr(database_module, "DB_PATH", db_file)

    database_module.migrate_db()  # must not raise

    conn = sqlite3.connect(db_file)
    cells = conn.execute("SELECT plant_guid, short_id FROM grid_cells WHERE plant_guid IS NULL").fetchall()
    conn.close()
    assert len(cells) == 0  # all cells now have plant_guid


def test_migrate_db_on_already_migrated_db_sets_version(tmp_path, monkeypatch):
    """A DB that already has all columns (user_version=0) gets version set to 1
    after migrate_db runs (idempotent column checks all pass, version advances)."""
    db_file = str(tmp_path / "test.db")
    pre = _make_pre_migration_db(db_file)
    # Manually add all Migration 1 columns so they already exist
    for sql in (
        "ALTER TABLE plantings ADD COLUMN qty_started INTEGER",
        "ALTER TABLE plantings ADD COLUMN qty_planted INTEGER",
        "ALTER TABLE plantings ADD COLUMN seed_lot_id INTEGER",
        "ALTER TABLE plantings ADD COLUMN method TEXT",
        "ALTER TABLE plantings ADD COLUMN purchased_date TEXT",
        "ALTER TABLE plantings ADD COLUMN planted_out_date TEXT",
        "ALTER TABLE seeds ADD COLUMN image_url TEXT",
        "ALTER TABLE seeds ADD COLUMN short_label TEXT",
        "ALTER TABLE seeds ADD COLUMN common_name TEXT",
        "ALTER TABLE seeds ADD COLUMN image_locked INTEGER",
        "ALTER TABLE label_positions ADD COLUMN orientation TEXT",
        "ALTER TABLE label_positions ADD COLUMN hidden INTEGER",
        "ALTER TABLE label_positions ADD COLUMN label_text TEXT",
        "ALTER TABLE grid_cells ADD COLUMN plant_guid TEXT",
        "ALTER TABLE grid_cells ADD COLUMN short_id TEXT",
        "ALTER TABLE grid_cells ADD COLUMN plant_status TEXT",
        "ALTER TABLE grid_cells ADD COLUMN plant_notes TEXT",
        "ALTER TABLE grid_cells ADD COLUMN label_visible INTEGER",
        "ALTER TABLE photos ADD COLUMN plant_guid TEXT",
    ):
        pre.execute(sql)
    pre.close()
    monkeypatch.setattr(database_module, "DB_PATH", db_file)

    database_module.migrate_db()

    conn = sqlite3.connect(db_file)
    version = conn.execute("PRAGMA user_version").fetchone()[0]
    conn.close()
    assert version == 1
