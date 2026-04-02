import sqlite3

from backend.app.schemas.plant import PlantUpdate, HarvestCreate


def get_plant(db: sqlite3.Connection, plant_guid: str) -> dict:
    row = db.execute("""
        SELECT gc.id as cell_id, gc.plant_guid, gc.short_id, gc.plant_status, gc.plant_notes,
               gc.label_visible, gc.row, gc.col, gc.structure_id, gc.planting_id,
               p.seed_id, p.status as planting_status, p.notes as family_notes,
               p.transplant_date, p.direct_sow_date, p.first_harvest_date, p.year,
               s.name as seed_name, s.short_label, s.category, s.variety,
               s.days_to_maturity, s.image_url,
               st.name as structure_name
        FROM grid_cells gc
        JOIN plantings p ON gc.planting_id = p.id
        JOIN seeds s ON p.seed_id = s.id
        LEFT JOIN structures st ON gc.structure_id = st.id
        WHERE gc.plant_guid = ?
    """, (plant_guid,)).fetchone()
    return dict(row) if row else None


def update_plant(db: sqlite3.Connection, plant_guid: str, data: PlantUpdate) -> dict:
    updates, values = [], []
    if data.plant_status is not None:
        updates.append("plant_status = ?"); values.append(data.plant_status)
    if data.plant_notes is not None:
        updates.append("plant_notes = ?"); values.append(data.plant_notes)
    if data.label_visible is not None:
        updates.append("label_visible = ?"); values.append(1 if data.label_visible else 0)
    if updates:
        values.append(plant_guid)
        db.execute(f"UPDATE grid_cells SET {', '.join(updates)} WHERE plant_guid = ?", values)
        db.commit()
    return {"message": "Plant updated"}


def list_plant_harvests(db: sqlite3.Connection, plant_guid: str) -> list:
    rows = db.execute(
        "SELECT * FROM plant_harvests WHERE plant_guid = ? ORDER BY harvest_date DESC",
        (plant_guid,)
    ).fetchall()
    return [dict(r) for r in rows]


def create_plant_harvest(db: sqlite3.Connection, plant_guid: str, data: HarvestCreate) -> dict:
    cursor = db.execute(
        "INSERT INTO plant_harvests (plant_guid, harvest_date, weight_oz, count, notes) VALUES (?,?,?,?,?)",
        (plant_guid, data.harvest_date, data.weight_oz, data.count, data.notes)
    )
    db.commit()
    return {"id": cursor.lastrowid, "message": "Harvest recorded"}


def delete_plant_harvest(db: sqlite3.Connection, harvest_id: int) -> dict:
    db.execute("DELETE FROM plant_harvests WHERE id = ?", (harvest_id,))
    db.commit()
    return {"message": "Harvest deleted"}
