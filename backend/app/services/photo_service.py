import logging
import os
import sqlite3
import uuid
from datetime import datetime

from fastapi import HTTPException

from backend.app.database import PHOTOS_DIR

logger = logging.getLogger(__name__)

MAX_PHOTO_BYTES = 20 * 1024 * 1024  # 20 MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"}
SAFE_MIME_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".heic": "image/heic",
    ".heif": "image/heif",
}


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
    if len(content) > MAX_PHOTO_BYTES:
        raise HTTPException(413, f"Photo exceeds {MAX_PHOTO_BYTES // (1024 * 1024)} MB limit")
    ext = os.path.splitext(filename_hint)[1].lower() if filename_hint else ".jpg"
    if ext not in ALLOWED_EXTENSIONS:
        ext = ".jpg"
    filename = f"{planting_id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(PHOTOS_DIR, filename)
    if not taken_date:
        taken_date = datetime.utcnow().strftime("%Y-%m-%d")
    try:
        ev_id = int(event_id_str.strip()) if event_id_str.strip() else None
    except ValueError:
        ev_id = None
    # Write-first atomicity pattern:
    # 1. Write content to a .tmp file  (failure → no DB record created)
    # 2. INSERT + commit               (failure → .tmp left on disk, no DB record)
    # 3. os.rename .tmp → final        (failure → compensating DELETE to remove the committed record)
    # This keeps DB records and physical files in sync under most failure modes.
    tmp_filepath = filepath + ".tmp"
    try:
        with open(tmp_filepath, "wb") as f:
            f.write(content)
    except OSError as exc:
        logger.error("Failed to write temp photo file %s: %s", tmp_filepath, exc)
        raise HTTPException(500, "Failed to save photo file") from exc
    cursor = db.execute(
        """INSERT INTO photos (planting_id, filename, original_name, caption, taken_date, event_id)
           VALUES (?,?,?,?,?,?)""",
        (planting_id, filename, filename_hint, caption, taken_date, ev_id)
    )
    db.commit()
    try:
        os.rename(tmp_filepath, filepath)
    except OSError as exc:
        logger.error("Failed to rename temp photo file %s → %s: %s", tmp_filepath, filepath, exc)
        # Compensate: remove the DB record that was just committed
        try:
            db.execute("DELETE FROM photos WHERE id = ?", (cursor.lastrowid,))
            db.commit()
        except Exception:
            pass
        try:
            os.unlink(tmp_filepath)
        except OSError:
            pass
        raise HTTPException(500, "Failed to save photo file") from exc
    return {"id": cursor.lastrowid, "filename": filename, "message": "Photo uploaded"}


def link_photo(
    db: sqlite3.Connection,
    filename: str,
    original_name: str,
    planting_id: int,
    event_id: int | None = None,
    caption: str = "",
    taken_date: str = "",
) -> dict:
    """Create a DB record pointing to an already-uploaded file (no disk I/O)."""
    if not taken_date:
        taken_date = datetime.utcnow().strftime("%Y-%m-%d")
    cursor = db.execute(
        """INSERT INTO photos (planting_id, filename, original_name, caption, taken_date, event_id)
           VALUES (?,?,?,?,?,?)""",
        (planting_id, filename, original_name, caption, taken_date, event_id)
    )
    db.commit()
    return {"id": cursor.lastrowid, "filename": filename, "message": "Photo linked"}


def delete_photo(db: sqlite3.Connection, photo_id: int) -> dict:
    photo = db.execute("SELECT filename FROM photos WHERE id = ?", (photo_id,)).fetchone()
    if photo:
        # Only delete the physical file if no other records share the same filename
        other = db.execute(
            "SELECT COUNT(*) FROM photos WHERE filename = ? AND id != ?",
            (photo["filename"], photo_id)
        ).fetchone()[0]
        if other == 0:
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
    if len(content) > MAX_PHOTO_BYTES:
        raise HTTPException(413, f"Photo exceeds {MAX_PHOTO_BYTES // (1024 * 1024)} MB limit")
    ext = os.path.splitext(filename_hint)[1].lower() if filename_hint else ".jpg"
    if ext not in ALLOWED_EXTENSIONS:
        ext = ".jpg"
    filename = f"plant_{plant_guid[:8]}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(PHOTOS_DIR, filename)
    if not taken_date:
        taken_date = datetime.utcnow().strftime("%Y-%m-%d")
    tmp_filepath = filepath + ".tmp"
    try:
        with open(tmp_filepath, "wb") as f:
            f.write(content)
    except OSError as exc:
        logger.error("Failed to write temp plant photo file %s: %s", tmp_filepath, exc)
        raise HTTPException(500, "Failed to save photo file") from exc
    cursor = db.execute(
        "INSERT INTO photos (planting_id, plant_guid, filename, original_name, caption, taken_date) VALUES (?,?,?,?,?,?)",
        (planting_id, plant_guid, filename, filename_hint, caption, taken_date)
    )
    db.commit()
    try:
        os.rename(tmp_filepath, filepath)
    except OSError as exc:
        logger.error("Failed to rename temp plant photo file %s → %s: %s", tmp_filepath, filepath, exc)
        try:
            db.execute("DELETE FROM photos WHERE id = ?", (cursor.lastrowid,))
            db.commit()
        except Exception:
            pass
        try:
            os.unlink(tmp_filepath)
        except OSError:
            pass
        raise HTTPException(500, "Failed to save photo file") from exc
    return {"id": cursor.lastrowid, "filename": filename, "message": "Photo uploaded"}
