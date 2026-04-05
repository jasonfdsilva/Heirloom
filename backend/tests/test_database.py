"""Unit tests for database.py helpers not exercised by API tests."""

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
    import sqlite3
    db_file = str(tmp_path / "raw_test.db")
    monkeypatch.setattr(database_module, "DB_PATH", db_file)
    conn = database_module._raw_conn()
    assert conn is not None
    assert isinstance(conn, sqlite3.Connection)
    conn.close()
