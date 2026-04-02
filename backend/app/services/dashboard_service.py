import sqlite3


def get_recent_activity(db: sqlite3.Connection, limit: int = 20) -> list:
    rows = db.execute("""
        SELECT e.id, e.planting_id, e.event_type, e.event_date, e.details,
               s.name AS seed_name, s.category
        FROM planting_events e
        LEFT JOIN plantings pl ON e.planting_id = pl.id
        LEFT JOIN seeds s ON pl.seed_id = s.id
        ORDER BY e.event_date DESC, e.id DESC
        LIMIT ?
    """, (limit,)).fetchall()
    return [dict(r) for r in rows]
