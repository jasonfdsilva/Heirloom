import json
import os
import sqlite3
import urllib.parse
import urllib.request
import uuid
from typing import Optional

from backend.app.database import PHOTOS_DIR
from backend.app.schemas.seed import SeedCreate, ImageUrlPatch

CATEGORY_FALLBACKS = {
    "Tomatoes": "Tomato", "Peppers": "Capsicum", "Herbs": "Herb",
    "Greens": "Leaf vegetable", "Beans": "Bean", "Brassicas": "Brassica",
    "Alliums": "Allium", "Cucurbits": "Cucurbit", "Root Vegetables": "Root vegetable",
}


def list_seeds(db: sqlite3.Connection) -> list:
    rows = db.execute("SELECT * FROM seeds ORDER BY category, name").fetchall()
    return [dict(r) for r in rows]


def create_seed(db: sqlite3.Connection, data: SeedCreate) -> dict:
    seed_id = data.name.lower().replace(" ", "-").replace("'", "")
    existing = db.execute("SELECT id FROM seeds WHERE id = ?", (seed_id,)).fetchone()
    suffix = 1
    base_id = seed_id
    while existing:
        seed_id = f"{base_id}-{suffix}"
        existing = db.execute("SELECT id FROM seeds WHERE id = ?", (seed_id,)).fetchone()
        suffix += 1
    db.execute(
        """INSERT INTO seeds (id, name, variety, category, species, days_to_maturity,
           germ_rate, lot, sku, organic, supplier, min_seeds, start_indoors, direct_sow,
           suggested_indoor_weeks, spacing_inches, image_url, short_label)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (seed_id, data.name, data.variety or data.name, data.category, data.species,
         data.days_to_maturity, data.germ_rate, data.lot, data.sku,
         1 if data.organic else 0, data.supplier, data.min_seeds,
         1 if data.start_indoors else 0, 1 if data.direct_sow else 0,
         data.suggested_indoor_weeks, data.spacing_inches, data.image_url, data.short_label)
    )
    db.commit()
    return {"id": seed_id, "message": "Seed created"}


def update_seed(db: sqlite3.Connection, seed_id: str, data: SeedCreate) -> dict:
    db.execute(
        """UPDATE seeds SET name=?, variety=?, category=?, species=?, days_to_maturity=?,
           germ_rate=?, lot=?, sku=?, organic=?, supplier=?, min_seeds=?,
           start_indoors=?, direct_sow=?, suggested_indoor_weeks=?, spacing_inches=?,
           image_url=?, short_label=?
           WHERE id=?""",
        (data.name, data.variety or data.name, data.category, data.species,
         data.days_to_maturity, data.germ_rate, data.lot, data.sku,
         1 if data.organic else 0, data.supplier, data.min_seeds,
         1 if data.start_indoors else 0, 1 if data.direct_sow else 0,
         data.suggested_indoor_weeks, data.spacing_inches, data.image_url, data.short_label,
         seed_id)
    )
    db.commit()
    return {"message": "Seed updated"}


def patch_seed_label(db: sqlite3.Connection, seed_id: str, short_label: Optional[str]) -> dict:
    db.execute("UPDATE seeds SET short_label=? WHERE id=?", (short_label, seed_id))
    db.commit()
    return {"message": "Label updated"}


def _wikipedia_image(query: str) -> Optional[str]:
    try:
        encoded = urllib.parse.quote(query)
        url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{encoded}"
        req = urllib.request.Request(url, headers={"User-Agent": "Heirloom/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
            thumb = data.get("thumbnail", {})
            src = thumb.get("source")
            if src:
                src = src.replace("/320px-", "/300px-").replace("/220px-", "/300px-")
                return src
    except Exception:
        pass
    return None


def search_image(query: str) -> dict:
    url = _wikipedia_image(query)
    if not url:
        simplified = query.replace(" OG", "").replace(" F1", "").replace(" Mix", "").strip()
        if simplified != query:
            url = _wikipedia_image(simplified)
    return {"image_url": url}


def fetch_all_images(db: sqlite3.Connection) -> dict:
    seeds = db.execute(
        "SELECT id, name, variety, category FROM seeds WHERE image_url IS NULL OR image_url = ''"
    ).fetchall()
    updated = 0
    for seed in seeds:
        url = _wikipedia_image(seed["name"])
        if not url and seed["variety"] and seed["variety"] != seed["name"]:
            url = _wikipedia_image(seed["variety"])
        if not url:
            fallback = CATEGORY_FALLBACKS.get(seed["category"], seed["category"])
            url = _wikipedia_image(fallback)
        if url:
            db.execute("UPDATE seeds SET image_url = ? WHERE id = ?", (url, seed["id"]))
            updated += 1
    db.commit()
    return {"updated": updated, "total": len(seeds)}


def upload_seed_image(db: sqlite3.Connection, seed_id: str, filename_hint: str, content: bytes) -> dict:
    ext = os.path.splitext(filename_hint)[1].lower() if filename_hint else ".jpg"
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        ext = ".jpg"
    filename = f"seed_{seed_id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(PHOTOS_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(content)
    image_url = f"/photos/{filename}"
    db.execute("UPDATE seeds SET image_url = ? WHERE id = ?", (image_url, seed_id))
    db.commit()
    return {"image_url": image_url}


def patch_seed_image_url(db: sqlite3.Connection, seed_id: str, data: ImageUrlPatch) -> dict:
    db.execute("UPDATE seeds SET image_url = ? WHERE id = ?", (data.image_url, seed_id))
    db.commit()
    return {"image_url": data.image_url}
