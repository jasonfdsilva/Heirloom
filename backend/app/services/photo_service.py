import os
import sqlite3
import uuid
from datetime import datetime

from backend.app.database import PHOTOS_DIR


def list_photos(db: sqlite3.Connection, planting_id: int) -> list:
    rows = db.execute(
        "SELECT * FROM photos WHERE planting_id = ? ORDER BY taken_date", (planting_id,)
    ).fetchall()
    return [dict(r) for r in rows]


def list_all_photos(db: sqlite3.Connection) -> list:
    rows = db.execute("""
        SELECT p.id, p.planting_id, p.plant_guid, p.filename, p.original_name,
               p.caption, p.taken_date, p.event_id, p.created_at,
               s.name AS seed_name, s.category
        FROM photos p
        LEFT JOIN plantings pl ON p.planting_id = pl.id
        LEFT JOIN seeds s ON pl.seed_id = s.id
        ORDER BY COALESCE(p.taken_date, '0000-00-00') DESC, p.created_at DESC
    """).fetchall()
    return [dict(r) for r in rows]


def upload_photo(
    db: sqlite3.Connection,
    planting_id: int,
    filename_hint: str,
    content: bytes,
    caption: str = "",
    taken_date: str = "",
    event_id_str: str = "",
) -> dict:
    ext = os.path.splitext(filename_hint)[1] if filename_hint else ".jpg"
    filename = f"{planting_id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(PHOTOS_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(content)
    if not taken_date:
        taken_date = datetime.utcnow().strftime("%Y-%m-%d")
    ev_id = int(event_id_str) if event_id_str.strip().isdigit() else None
    cursor = db.execute(
        """INSERT INTO photos (planting_id, filename, original_name, caption, taken_date, event_id)
           VALUES (?,?,?,?,?,?)""",
        (planting_id, filename, filename_hint, caption, taken_date, ev_id)
    )
    db.commit()
    return {"id": cursor.lastrowid, "filename": filename, "message": "Photo uploaded"}


def delete_photo(db: sqlite3.Connection, photo_id: int) -> dict:
    photo = db.execute("SELECT filename FROM photos WHERE id = ?", (photo_id,)).fetchone()
    if photo:
        filepath = os.path.join(PHOTOS_DIR, photo["filename"])
        if os.path.exists(filepath):
            os.remove(filepath)
        db.execute("DELETE FROM photos WHERE id = ?", (photo_id,))
        db.commit()
    return {"message": "Photo deleted"}


def list_plant_photos(db: sqlite3.Connection, plant_guid: str) -> list:
    rows = db.execute(
        "SELECT * FROM photos WHERE plant_guid = ? ORDER BY taken_date", (plant_guid,)
    ).fetchall()
    return [dict(r) for r in rows]


def upload_plant_photo(
    db: sqlite3.Connection,
    plant_guid: str,
    planting_id: int,
    filename_hint: str,
    content: bytes,
    caption: str = "",
    taken_date: str = "",
) -> dict:
    ext = os.path.splitext(filename_hint)[1].lower() if filename_hint else ".jpg"
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        ext = ".jpg"
    filename = f"plant_{plant_guid[:8]}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(PHOTOS_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(content)
    if not taken_date:
        taken_date = datetime.utcnow().strftime("%Y-%m-%d")
    cursor = db.execute(
        "INSERT INTO photos (planting_id, plant_guid, filename, original_name, caption, taken_date) VALUES (?,?,?,?,?,?)",
        (planting_id, plant_guid, filename, filename_hint, caption, taken_date)
    )
    db.commit()
    return {"id": cursor.lastrowid, "filename": filename, "message": "Photo uploaded"}
