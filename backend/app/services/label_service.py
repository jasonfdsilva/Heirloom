import sqlite3
from typing import List

from backend.app.schemas.label import LabelPosition


def get_label_positions(db: sqlite3.Connection) -> list:
    rows = db.execute(
        "SELECT entity_type, entity_id, label_x, label_y FROM label_positions"
    ).fetchall()
    return [dict(r) for r in rows]


def save_label_positions(db: sqlite3.Connection, positions: List[LabelPosition]) -> dict:
    for pos in positions:
        db.execute("""
            INSERT INTO label_positions (entity_type, entity_id, label_x, label_y, orientation, hidden, label_text)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (entity_type, entity_id) DO UPDATE SET
                label_x=excluded.label_x, label_y=excluded.label_y,
                orientation=excluded.orientation, hidden=excluded.hidden,
                label_text=excluded.label_text
        """, (pos.entity_type, pos.entity_id, pos.label_x, pos.label_y,
              pos.orientation, int(pos.hidden), pos.label_text))
    db.commit()
    return {"message": "Saved"}
