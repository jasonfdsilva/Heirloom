import sqlite3

from backend.app.schemas.event import BulkEventCreate, EventCreate


def _sync_failed_status(db: sqlite3.Connection, planting_id: int) -> None:
    """Set planting status to 'failed' if any failed events exist, revert to 'planned' if not."""
    row = db.execute(
        "SELECT COUNT(*) FROM planting_events WHERE planting_id = ? AND event_type = 'failed'",
        (planting_id,)
    ).fetchone()
    has_failed_event = row[0] > 0
    current = db.execute("SELECT status FROM plantings WHERE id = ?", (planting_id,)).fetchone()
    if not current:
        return
    if has_failed_event and current["status"] != "failed":
        db.execute("UPDATE plantings SET status = 'failed' WHERE id = ?", (planting_id,))
    elif not has_failed_event and current["status"] == "failed":
        db.execute("UPDATE plantings SET status = 'planned' WHERE id = ?", (planting_id,))


def create_event(db: sqlite3.Connection, planting_id: int, data: EventCreate) -> dict:
    cursor = db.execute(
        """INSERT INTO planting_events
           (planting_id, event_date, event_type, details, severity, product_used, quantity)
           VALUES (?,?,?,?,?,?,?)""",
        (planting_id, data.event_date, data.event_type, data.details,
         data.severity, data.product_used, data.quantity)
    )
    # Keep planting status in sync with whether any failed events exist
    if data.event_type == "failed":
        _sync_failed_status(db, planting_id)
    db.commit()
    return {"id": cursor.lastrowid, "message": "Event created"}


def update_event(db: sqlite3.Connection, event_id: int, data: EventCreate) -> dict:
    # Look up planting_id before updating so we can sync status afterward
    row = db.execute("SELECT planting_id FROM planting_events WHERE id = ?", (event_id,)).fetchone()
    planting_id = row["planting_id"] if row else None

    db.execute(
        """UPDATE planting_events
           SET event_date=?, event_type=?, details=?, severity=?, product_used=?, quantity=?
           WHERE id=?""",
        (data.event_date, data.event_type, data.details,
         data.severity, data.product_used, data.quantity, event_id)
    )
    # Re-sync: handles both "changed to failed" and "changed away from failed"
    if planting_id is not None:
        _sync_failed_status(db, planting_id)
    db.commit()
    return {"message": "Event updated"}


def delete_event(db: sqlite3.Connection, event_id: int) -> dict:
    # Look up planting_id before deleting so we can sync status afterward
    row = db.execute("SELECT planting_id FROM planting_events WHERE id = ?", (event_id,)).fetchone()
    planting_id = row["planting_id"] if row else None

    db.execute("DELETE FROM planting_events WHERE id = ?", (event_id,))

    # If we just deleted a failed event, revert status to planned if no others remain
    if planting_id is not None:
        _sync_failed_status(db, planting_id)
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
    # Sync status for all affected plantings
    if data.event_type == "failed":
        for pid in planting_ids:
            _sync_failed_status(db, pid)
    db.commit()
    return {"created": len(planting_ids), "message": f"Event logged for {len(planting_ids)} plantings", "pairs": pairs}
