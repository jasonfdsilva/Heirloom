import sqlite3
from datetime import datetime


def export_data(db: sqlite3.Connection) -> dict:
    return {
        "exported_at": datetime.utcnow().isoformat(),
        "seeds": [dict(r) for r in db.execute("SELECT * FROM seeds").fetchall()],
        "structures": [dict(r) for r in db.execute("SELECT * FROM structures").fetchall()],
        "plantings": [dict(r) for r in db.execute("SELECT * FROM plantings").fetchall()],
        "events": [dict(r) for r in db.execute("SELECT * FROM planting_events").fetchall()],
        "photos": [dict(r) for r in db.execute("SELECT * FROM photos").fetchall()],
        "grid_cells": [dict(r) for r in db.execute("SELECT * FROM grid_cells").fetchall()],
        "plant_harvests": [dict(r) for r in db.execute("SELECT * FROM plant_harvests").fetchall()],
    }


def import_data(db: sqlite3.Connection, data: dict) -> dict:
    db.executescript("""
        DELETE FROM plant_harvests;
        DELETE FROM grid_cells;
        DELETE FROM photos;
        DELETE FROM planting_events;
        DELETE FROM plantings;
        DELETE FROM structures;
        DELETE FROM seeds;
    """)

    for s in data.get("seeds", []):
        db.execute(
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
        db.execute(
            "INSERT INTO structures (id, name, type, width, length, map_x, map_y) VALUES (?,?,?,?,?,?,?)",
            (st["id"], st["name"], st["type"], st["width"], st["length"],
             st.get("map_x"), st.get("map_y"))
        )

    for p in data.get("plantings", []):
        db.execute(
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
        db.execute(
            """INSERT INTO planting_events (id, planting_id, event_date, event_type,
               details, severity, product_used, quantity, created_at) VALUES (?,?,?,?,?,?,?,?,?)""",
            (e["id"], e["planting_id"], e["event_date"], e["event_type"],
             e.get("details"), e.get("severity"), e.get("product_used"),
             e.get("quantity"), e.get("created_at"))
        )

    for ph in data.get("photos", []):
        db.execute(
            """INSERT INTO photos (id, planting_id, filename, original_name, caption, taken_date, created_at)
               VALUES (?,?,?,?,?,?,?)""",
            (ph["id"], ph["planting_id"], ph["filename"], ph.get("original_name"),
             ph.get("caption"), ph.get("taken_date"), ph.get("created_at"))
        )

    for gc in data.get("grid_cells", []):
        db.execute(
            """INSERT INTO grid_cells (id, planting_id, structure_id, row, col,
               plant_guid, short_id, plant_status, plant_notes, label_visible)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (gc["id"], gc["planting_id"], gc["structure_id"], gc["row"], gc["col"],
             gc.get("plant_guid"), gc.get("short_id"),
             gc.get("plant_status", "healthy"), gc.get("plant_notes"),
             gc.get("label_visible", 1))
        )

    for h in data.get("plant_harvests", []):
        db.execute(
            """INSERT INTO plant_harvests (id, plant_guid, harvest_date, weight_oz, count, notes, created_at)
               VALUES (?,?,?,?,?,?,?)""",
            (h["id"], h["plant_guid"], h["harvest_date"], h.get("weight_oz"),
             h.get("count"), h.get("notes"), h.get("created_at"))
        )

    db.commit()
    return {"message": "Data imported successfully"}
