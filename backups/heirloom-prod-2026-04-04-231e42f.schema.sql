-- Heirloom production database schema dump
-- Date: 2026-04-04
-- Git commit: 231e42f (Improve seed lots UX: inline variety creation, scan species extraction, sowing method)
-- Tables: grid_cells, label_positions, photos, plant_harvests, planting_events, plantings, seed_lots, seeds, structures
-- Source: heirloom-heirloom-1:/app/data/heirloom.db

CREATE TABLE grid_cells (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            planting_id INTEGER NOT NULL REFERENCES plantings(id) ON DELETE CASCADE,
            structure_id TEXT NOT NULL REFERENCES structures(id),
            row INTEGER NOT NULL,
            col INTEGER NOT NULL, plant_guid TEXT, short_id TEXT, plant_status TEXT DEFAULT 'healthy', plant_notes TEXT, label_visible INTEGER DEFAULT 1,
            UNIQUE(structure_id, row, col)
        );

CREATE TABLE label_positions (
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            label_x REAL,
            label_y REAL, orientation TEXT DEFAULT 'horizontal', hidden INTEGER DEFAULT 0, label_text TEXT,
            PRIMARY KEY (entity_type, entity_id)
        );

CREATE TABLE photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            planting_id INTEGER NOT NULL REFERENCES plantings(id) ON DELETE CASCADE,
            filename TEXT NOT NULL,
            original_name TEXT,
            caption TEXT,
            taken_date TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        , plant_guid TEXT, event_id INTEGER REFERENCES planting_events(id));

CREATE TABLE plant_harvests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plant_guid TEXT NOT NULL,
            harvest_date TEXT NOT NULL,
            weight_oz REAL,
            count INTEGER,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

CREATE TABLE planting_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            planting_id INTEGER NOT NULL REFERENCES plantings(id) ON DELETE CASCADE,
            event_date TEXT NOT NULL,
            event_type TEXT NOT NULL,
            details TEXT,
            severity TEXT,
            product_used TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        , quantity INTEGER);

CREATE TABLE plantings (
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
        , qty_started INTEGER, qty_planted INTEGER, seed_lot_id INTEGER REFERENCES seed_lots(id));

CREATE TABLE seed_lots (
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

CREATE TABLE seeds (
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
        , image_url TEXT, short_label TEXT);

CREATE TABLE sqlite_sequence(name,seq);

CREATE TABLE structures (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            width REAL NOT NULL,
            length REAL NOT NULL,
            map_x REAL,
            map_y REAL
        );

CREATE INDEX idx_harvests_guid ON plant_harvests (plant_guid);

CREATE INDEX idx_seed_lots_seed_id ON seed_lots (seed_id);
