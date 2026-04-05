import sqlite3

import pytest
from fastapi.testclient import TestClient

import backend.app.main as main_module
from backend.app.database import get_db
from backend.app.main import app
from backend.tests.fixtures.mock_data import insert_mock_data


@pytest.fixture
def test_db():
    """In-memory SQLite database, schema created, mock data inserted."""
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    # Reuse init_db schema creation — monkey-patch DB_PATH to :memory:
    # by calling executescript directly from database module source
    _create_schema(conn)
    insert_mock_data(conn)
    yield conn
    conn.close()


def _create_schema(conn: sqlite3.Connection) -> None:
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
            notes TEXT,
            image_url TEXT,
            image_locked INTEGER DEFAULT 0,
            short_label TEXT
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

        CREATE TABLE IF NOT EXISTS plantings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seed_id TEXT NOT NULL REFERENCES seeds(id),
            structure_id TEXT REFERENCES structures(id),
            seed_lot_id INTEGER REFERENCES seed_lots(id),
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
            plant_guid TEXT,
            short_id TEXT,
            plant_status TEXT DEFAULT 'healthy',
            plant_notes TEXT,
            label_visible INTEGER DEFAULT 1,
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
            plant_guid TEXT,
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
    """)


@pytest.fixture
def client(test_db, monkeypatch):
    """TestClient with the real DB dependency overridden by test_db.
    init_db/migrate_db are patched to no-ops so the lifespan doesn't
    try to connect to the production SQLite path."""
    monkeypatch.setattr(main_module, "init_db", lambda: None)
    monkeypatch.setattr(main_module, "migrate_db", lambda: None)
    app.dependency_overrides[get_db] = lambda: test_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
