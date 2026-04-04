import sqlite3
from datetime import datetime

from backend.app.schemas.planting import PlantingCreate, PlantingUpdate, FamilyNotesUpdate


def list_plantings(db: sqlite3.Connection, year: int = 2026) -> list:
    rows = db.execute("""
        SELECT p.*, s.name as seed_name, s.category, s.days_to_maturity,
               s.organic, s.variety, st.name as structure_name
        FROM plantings p
        JOIN seeds s ON p.seed_id = s.id
        LEFT JOIN structures st ON p.structure_id = st.id
        WHERE p.year = ?
        ORDER BY p.created_at
    """, (year,)).fetchall()

    grid_rows = db.execute("""
        SELECT planting_id, structure_id, COUNT(*) as cells
        FROM grid_cells GROUP BY planting_id, structure_id
    """).fetchall()
    grid_by_planting: dict = {}
    for gr in grid_rows:
        pid = gr["planting_id"]
        if pid not in grid_by_planting:
            grid_by_planting[pid] = {"structures": [], "total": 0}
        grid_by_planting[pid]["structures"].append(gr["structure_id"])
        grid_by_planting[pid]["total"] += gr["cells"]

    result = []
    for r in rows:
        d = dict(r)
        events = db.execute(
            "SELECT * FROM planting_events WHERE planting_id = ? ORDER BY event_date",
            (d["id"],)
        ).fetchall()
        d["events"] = [dict(e) for e in events]
        # Compute derived event metadata
        d["last_event_type"] = d["events"][-1]["event_type"] if d["events"] else None
        seen_types = []
        for ev in d["events"]:
            if ev["event_type"] not in seen_types:
                seen_types.append(ev["event_type"])
        d["all_event_types"] = seen_types
        germ_events = [e for e in d["events"] if e["event_type"] == "germinated"]
        total_germinated = sum(e["quantity"] or 0 for e in germ_events)
        qty_started = d.get("qty_started") or 0
        d["actual_germ_count"] = total_germinated
        d["actual_germ_rate"] = round(total_germinated / qty_started * 100, 1) if qty_started > 0 else None
        photo_count = db.execute(
            "SELECT COUNT(*) FROM photos WHERE planting_id = ?", (d["id"],)
        ).fetchone()[0]
        d["photo_count"] = photo_count
        grid_info = grid_by_planting.get(d["id"], {"structures": [], "total": 0})
        d["grid_structures"] = grid_info["structures"]
        d["grid_cells_total"] = grid_info["total"]
        d["placed_count"] = grid_info["total"]
        d["unplaced_count"] = max(0, (d.get("qty_started") or 0) - grid_info["total"])
        result.append(d)
    return result


def create_planting(db: sqlite3.Connection, data: PlantingCreate) -> dict:
    cursor = db.execute(
        """INSERT INTO plantings (seed_id, structure_id, year, qty_started, qty_planted,
           indoor_start_date, hardening_date, transplant_date, direct_sow_date,
           method, purchased_date, planted_out_date,
           first_harvest_date, status, notes, seed_lot_id)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (data.seed_id, data.structure_id, data.year, data.qty_started, data.qty_planted,
         data.indoor_start_date, data.hardening_date, data.transplant_date,
         data.direct_sow_date, data.method, data.purchased_date, data.planted_out_date,
         data.first_harvest_date, data.status, data.notes,
         data.seed_lot_id)
    )
    db.commit()
    return {"id": cursor.lastrowid, "message": "Planting created"}


def update_planting(db: sqlite3.Connection, planting_id: int, data: PlantingUpdate) -> dict:
    updates = []
    values = []
    for field, val in data.dict(exclude_unset=True).items():
        updates.append(f"{field} = ?")
        values.append(val)
    if updates:
        updates.append("updated_at = ?")
        values.append(datetime.utcnow().isoformat())
        values.append(planting_id)
        db.execute(f"UPDATE plantings SET {', '.join(updates)} WHERE id = ?", values)
        db.commit()
    return {"message": "Planting updated"}


def delete_planting(db: sqlite3.Connection, planting_id: int) -> dict:
    db.execute("DELETE FROM plantings WHERE id = ?", (planting_id,))
    db.commit()
    return {"message": "Planting deleted"}


def duplicate_planting(db: sqlite3.Connection, planting_id: int) -> dict:
    original = db.execute("SELECT * FROM plantings WHERE id = ?", (planting_id,)).fetchone()
    o = dict(original)
    cursor = db.execute(
        """INSERT INTO plantings (seed_id, structure_id, year, qty_started, qty_planted,
           indoor_start_date, hardening_date, transplant_date, direct_sow_date,
           method, purchased_date, planted_out_date,
           first_harvest_date, status, notes)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (o["seed_id"], None, o["year"], o.get("qty_started"), o.get("qty_planted"),
         o["indoor_start_date"], o["hardening_date"], o["transplant_date"],
         o["direct_sow_date"], o.get("method", "indoors"), o.get("purchased_date"),
         o.get("planted_out_date"), o["first_harvest_date"], o["status"], o["notes"])
    )
    db.commit()
    return {"id": cursor.lastrowid, "message": "Planting duplicated"}


def update_family_notes(db: sqlite3.Connection, planting_id: int, data: FamilyNotesUpdate) -> dict:
    db.execute(
        "UPDATE plantings SET notes = ?, updated_at = ? WHERE id = ?",
        (data.notes, datetime.utcnow().isoformat(), planting_id)
    )
    db.commit()
    return {"message": "Family notes updated"}
