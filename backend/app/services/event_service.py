import sqlite3

from backend.app.schemas.event import BulkEventCreate, EventCreate


def create_event(db: sqlite3.Connection, planting_id: int, data: EventCreate) -> dict:
    cursor = db.execute(
        """INSERT INTO planting_events
           (planting_id, event_date, event_type, details, severity, product_used, quantity)
           VALUES (?,?,?,?,?,?,?)""",
        (planting_id, data.event_date, data.event_type, data.details,
         data.severity, data.product_used, data.quantity)
    )
    db.commit()
    return {"id": cursor.lastrowid, "message": "Event created"}


def update_event(db: sqlite3.Connection, event_id: int, data: EventCreate) -> dict:
    db.execute(
        """UPDATE planting_events
           SET event_date=?, event_type=?, details=?, severity=?, product_used=?, quantity=?
           WHERE id=?""",
        (data.event_date, data.event_type, data.details,
         data.severity, data.product_used, data.quantity, event_id)
    )
    db.commit()
    return {"message": "Event updated"}


def delete_event(db: sqlite3.Connection, event_id: int) -> dict:
    db.execute("DELETE FROM planting_events WHERE id = ?", (event_id,))
    db.commit()
    return {"message": "Event deleted"}


def create_bulk_events(db: sqlite3.Connection, planting_ids: list, data: BulkEventCreate) -> dict:
    pairs = []
    for pid in planting_ids:
        # For germination events, default quantity to qty_started (100% germination rate)
        quantity = None
        if data.event_type == "germinated":
            row = db.execute("SELECT qty_started FROM plantings WHERE id = ?", (pid,)).fetchone()
            quantity = row["qty_started"] if row and row["qty_started"] else None
        cursor = db.execute(
            """INSERT INTO planting_events
               (planting_id, event_date, event_type, details, severity, product_used, quantity)
               VALUES (?,?,?,?,?,?,?)""",
            (pid, data.event_date, data.event_type, data.details,
             data.severity, data.product_used, quantity)
        )
        pairs.append({"event_id": cursor.lastrowid, "planting_id": pid})
    db.commit()
    return {"created": len(planting_ids), "message": f"Event logged for {len(planting_ids)} plantings", "pairs": pairs}
