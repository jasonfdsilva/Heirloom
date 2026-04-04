import base64
import json
import sqlite3
from typing import Optional

from backend.app.database import lot_prefix
from backend.app.schemas.seed_lot import SeedLotCreate, SeedLotUpdate


# ── Lot code generation ───────────────────────────────────────────────────────

def generate_lot_code(db: sqlite3.Connection, seed_id: str, packed_for_year: int) -> str:
    """Auto-generate a unique lot code like CPT-2026-001."""
    row = db.execute("SELECT name FROM seeds WHERE id = ?", (seed_id,)).fetchone()
    if not row:
        raise ValueError(f"Seed {seed_id!r} not found")
    prefix = lot_prefix(row["name"])
    year = int(packed_for_year)
    pattern = f"{prefix}-{year}-%"
    existing = db.execute(
        "SELECT lot_code FROM seed_lots WHERE lot_code LIKE ? ORDER BY lot_code DESC LIMIT 1",
        (pattern,),
    ).fetchone()
    if existing:
        try:
            seq = int(existing["lot_code"].rsplit("-", 1)[-1])
        except ValueError:
            seq = 0
    else:
        seq = 0
    return f"{prefix}-{year}-{seq + 1:03d}"


# ── CRUD ──────────────────────────────────────────────────────────────────────

def list_lots(db: sqlite3.Connection) -> list:
    rows = db.execute("""
        SELECT sl.*, s.name AS seed_name, s.category
        FROM seed_lots sl
        JOIN seeds s ON sl.seed_id = s.id
        ORDER BY sl.packed_for_year DESC, sl.lot_code
    """).fetchall()
    return [dict(r) for r in rows]


def get_lot(db: sqlite3.Connection, lot_id: int) -> Optional[dict]:
    row = db.execute("SELECT * FROM seed_lots WHERE id = ?", (lot_id,)).fetchone()
    return dict(row) if row else None


def create_lot(db: sqlite3.Connection, data: SeedLotCreate) -> dict:
    # Validate seed exists
    seed = db.execute("SELECT id FROM seeds WHERE id = ?", (data.seed_id,)).fetchone()
    if not seed:
        raise ValueError(f"Seed {data.seed_id!r} not found")

    # Auto-generate lot_code if not supplied
    lot_code = data.lot_code
    if not lot_code:
        year = data.packed_for_year or 2026
        lot_code = generate_lot_code(db, data.seed_id, year)

    db.execute(
        """INSERT INTO seed_lots
           (seed_id, lot_code, packed_for_year, purchased_year, supplier, supplier_lot,
            sku, germ_rate, notes, packet_image_url)
           VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (data.seed_id, lot_code, data.packed_for_year, data.purchased_year,
         data.supplier, data.supplier_lot, data.sku, data.germ_rate,
         data.notes, data.packet_image_url),
    )
    db.commit()
    row = db.execute(
        "SELECT sl.*, s.name AS seed_name, s.category FROM seed_lots sl JOIN seeds s ON sl.seed_id = s.id WHERE sl.lot_code = ?",
        (lot_code,),
    ).fetchone()
    return dict(row)


def update_lot(db: sqlite3.Connection, lot_id: int, data: SeedLotUpdate) -> dict:
    fields = {k: v for k, v in data.model_dump(exclude_unset=True).items()}
    if not fields:
        row = db.execute("SELECT * FROM seed_lots WHERE id = ?", (lot_id,)).fetchone()
        return dict(row) if row else {}
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [lot_id]
    db.execute(f"UPDATE seed_lots SET {set_clause} WHERE id = ?", values)
    db.commit()
    row = db.execute(
        "SELECT sl.*, s.name AS seed_name, s.category FROM seed_lots sl JOIN seeds s ON sl.seed_id = s.id WHERE sl.id = ?",
        (lot_id,),
    ).fetchone()
    return dict(row) if row else {}


def delete_lot(db: sqlite3.Connection, lot_id: int) -> bool:
    existing = db.execute("SELECT id FROM seed_lots WHERE id = ?", (lot_id,)).fetchone()
    if not existing:
        return False
    # Nullify FK before delete (SQLite doesn't support ON DELETE SET NULL via ALTER TABLE)
    db.execute("UPDATE plantings SET seed_lot_id = NULL WHERE seed_lot_id = ?", (lot_id,))
    db.execute("DELETE FROM seed_lots WHERE id = ?", (lot_id,))
    db.commit()
    return True


# ── Claude vision extraction ──────────────────────────────────────────────────

def extract_packet_data(image_bytes: bytes, mime_type: str) -> dict:
    """Send packet image to Claude vision and extract structured seed data."""
    import anthropic  # lazy import — not installed in all environments

    client = anthropic.Anthropic()
    prompt = (
        "Extract seed packet information. Return ONLY a JSON object with these keys: "
        "name, category, supplier, supplier_lot, sku, packed_for_year (integer or null), "
        "germ_rate (float 0-100 or null), days_to_maturity (string or null), "
        "organic (boolean or null), notes. Use null for any missing fields."
    )
    msg = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=512,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": mime_type,
                            "data": base64.b64encode(image_bytes).decode(),
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            }
        ],
    )
    text = msg.content[0].text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    return json.loads(text)
