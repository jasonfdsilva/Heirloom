import json
import logging
import os
import re
import sqlite3
import urllib.parse
import urllib.request
import uuid
from typing import Optional

from fastapi import HTTPException

from backend.app.database import PHOTOS_DIR
from backend.app.schemas.seed import SeedCreate, ImageUrlPatch
from backend.app.services.photo_service import ALLOWED_EXTENSIONS, MAX_PHOTO_BYTES

logger = logging.getLogger(__name__)

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
        """INSERT INTO seeds (id, name, variety, category, common_name, species, days_to_maturity,
           germ_rate, lot, sku, organic, supplier, min_seeds, start_indoors, direct_sow,
           suggested_indoor_weeks, spacing_inches, image_url, image_locked, short_label)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (seed_id, data.name, data.variety or data.name, data.category, data.common_name,
         data.species, data.days_to_maturity, data.germ_rate, data.lot, data.sku,
         1 if data.organic else 0, data.supplier, data.min_seeds,
         1 if data.start_indoors else 0, 1 if data.direct_sow else 0,
         data.suggested_indoor_weeks, data.spacing_inches, data.image_url,
         1 if data.image_locked else 0, data.short_label)
    )
    db.commit()
    return {"id": seed_id, "message": "Seed created"}


def update_seed(db: sqlite3.Connection, seed_id: str, data: SeedCreate) -> dict:
    db.execute(
        """UPDATE seeds SET name=?, variety=?, category=?, common_name=?, species=?,
           days_to_maturity=?, germ_rate=?, lot=?, sku=?, organic=?, supplier=?, min_seeds=?,
           start_indoors=?, direct_sow=?, suggested_indoor_weeks=?, spacing_inches=?,
           image_url=?, image_locked=?, short_label=?, notes=?
           WHERE id=?""",
        (data.name, data.variety or data.name, data.category, data.common_name, data.species,
         data.days_to_maturity, data.germ_rate, data.lot, data.sku,
         1 if data.organic else 0, data.supplier, data.min_seeds,
         1 if data.start_indoors else 0, 1 if data.direct_sow else 0,
         data.suggested_indoor_weeks, data.spacing_inches, data.image_url,
         1 if data.image_locked else 0, data.short_label, data.notes, seed_id)
    )
    db.commit()
    return {"message": "Seed updated"}


def patch_seed_label(db: sqlite3.Connection, seed_id: str, short_label: Optional[str]) -> dict:
    db.execute("UPDATE seeds SET short_label=? WHERE id=?", (short_label, seed_id))
    db.commit()
    return {"message": "Label updated"}


def _johnnys_image(query: str) -> Optional[str]:  # pragma: no cover
    """Search Johnny's Seeds and return the first product image URL found."""
    try:
        encoded = urllib.parse.quote(query)
        url = f"https://www.johnnyseeds.com/search?q={encoded}"
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        })
        with urllib.request.urlopen(req, timeout=8) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
        # Johnny's uses Salesforce Commerce Cloud — product images served from their CDN.
        # Match both src= and data-src= (lazy-loaded) image URLs from their catalog.
        candidates = re.findall(
            r'(?:src|data-src)=["\']'
            r'(https://www\.johnnyseeds\.com/dw/image/v2/[^"\'?\s]+\.(?:jpg|jpeg|png|webp))'
            r'[^"\']*["\']',
            html
        )
        # Filter out tiny swatches / icons (URLs often include "/small/" or "swatch")
        product_imgs = [
            c for c in candidates
            if not any(x in c.lower() for x in ("/swatch", "/icon", "/logo", "/badge"))
        ]
        if product_imgs:
            # Prefer higher-res by replacing size suffix if present
            img = product_imgs[0]
            img = re.sub(r'sw=\d+', 'sw=400', img)
            img = re.sub(r'sh=\d+', 'sh=400', img)
            return img
    except Exception as exc:
        logger.warning("Johnny's image search failed for %r: %s", query, exc)
    return None


def _wikipedia_image(query: str) -> Optional[str]:  # pragma: no cover
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
    except Exception as exc:
        logger.warning("Wikipedia image search failed for %r: %s", query, exc)
    return None


def search_image(
    query: str,
    common_name: Optional[str] = None,
    species: Optional[str] = None,
    category: Optional[str] = None,
) -> dict:  # pragma: no cover
    """Search for a seed image using the full waterfall: Johnny's → Wikipedia."""
    url = None

    # ── Tier 1: Johnny's Seeds ────────────────────────────────────────────
    url = _johnnys_image(query)
    if not url and common_name and common_name != query:
        url = _johnnys_image(common_name)
    if not url and species:
        url = _johnnys_image(species)
    if not url and category:
        url = _johnnys_image(category)

    # ── Tier 2: Wikipedia ─────────────────────────────────────────────────
    if not url and common_name:
        url = _wikipedia_image(common_name)
    if not url:
        url = _wikipedia_image(query)
    if not url:
        simplified = query.replace(" OG", "").replace(" F1", "").replace(" Mix", "").strip()
        if simplified != query:
            url = _wikipedia_image(simplified)
    if not url and category:
        fallback = CATEGORY_FALLBACKS.get(category, category)
        url = _wikipedia_image(fallback)

    return {"image_url": url}


def fetch_all_images(db: sqlite3.Connection) -> dict:  # pragma: no cover
    """Re-fetch images for all seeds using the full waterfall: Johnny's Seeds → Wikipedia.

    Rules:
    - Seeds with a user-uploaded image (/photos/...) are NEVER touched.
    - Seeds with a Wikipedia/Wikimedia image are always re-fetched (they may have improved
      with a common_name set since the last run).
    - Seeds with no image are fetched for the first time.

    Returns updated count and a list of seed names whose image actually changed.
    """
    seeds = db.execute(
        """SELECT id, name, variety, category, common_name, species, image_url
           FROM seeds
           WHERE (image_locked IS NULL OR image_locked = 0)
             AND image_url NOT LIKE '/photos/%'
             AND (image_url IS NULL
                  OR image_url = ''
                  OR image_url LIKE '%wikipedia%'
                  OR image_url LIKE '%wikimedia%'
                  OR image_url LIKE '%johnnyseeds%')"""
    ).fetchall()

    updated = 0
    changes = []
    for seed in seeds:
        name = seed["name"]
        common = seed["common_name"]
        category = seed["category"]
        species = seed["species"]
        variety = seed["variety"]
        old_url = seed["image_url"] or ""

        url = None

        # ── Tier 1: Johnny's Seeds ─────────────────────────────────────────
        url = _johnnys_image(name)
        if not url and common and common != name:
            url = _johnnys_image(common)
        if not url and species:
            url = _johnnys_image(species)
        if not url:
            url = _johnnys_image(category)

        # ── Tier 2: Wikipedia ──────────────────────────────────────────────
        if not url and common:
            url = _wikipedia_image(common)
        if not url:
            url = _wikipedia_image(name)
        if not url and variety and variety != name:
            url = _wikipedia_image(variety)
        if not url:
            fallback = CATEGORY_FALLBACKS.get(category, category)
            url = _wikipedia_image(fallback)

        if url and url != old_url:
            db.execute("UPDATE seeds SET image_url = ? WHERE id = ?", (url, seed["id"]))
            updated += 1
            changes.append({"name": name, "common_name": common})

    db.commit()
    return {"updated": updated, "total": len(seeds), "changes": changes}


def suggest_common_name(name: str, category: str, species: Optional[str] = None) -> Optional[str]:  # pragma: no cover
    try:
        import anthropic
        client = anthropic.Anthropic()
        species_hint = f"\nSpecies: {species}" if species else ""
        prompt = (
            f"What is the common English plant name for this seed variety?\n"
            f"Variety: {name}\nCategory: {category}{species_hint}\n\n"
            f"Reply with ONLY the common name, 1-3 words maximum. "
            f"Examples: Kale, Cherry Tomato, Bell Pepper, Spinach, Romaine Lettuce, Cilantro, Onion."
        )
        msg = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=20,
            messages=[{"role": "user", "content": prompt}]
        )
        return msg.content[0].text.strip()
    except Exception as exc:
        logger.warning("suggest_common_name failed for %r: %s", name, exc)
        return None


def upload_seed_image(db: sqlite3.Connection, seed_id: str, filename_hint: str, content: bytes) -> dict:
    if not db.execute("SELECT id FROM seeds WHERE id = ?", (seed_id,)).fetchone():
        raise HTTPException(404, "Seed not found")
    if len(content) > MAX_PHOTO_BYTES:
        raise HTTPException(413, f"Image exceeds {MAX_PHOTO_BYTES // (1024 * 1024)} MB limit")
    ext = os.path.splitext(filename_hint)[1].lower() if filename_hint else ".jpg"
    if ext not in ALLOWED_EXTENSIONS:
        ext = ".jpg"
    filename = f"seed_{seed_id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(PHOTOS_DIR, filename)
    tmp_filepath = filepath + ".tmp"
    try:
        with open(tmp_filepath, "wb") as f:
            f.write(content)
    except OSError as exc:
        logger.error("Failed to write temp seed image file %s: %s", tmp_filepath, exc)
        raise HTTPException(500, "Failed to save image file") from exc
    # Rename-first ordering: file is moved to its permanent path before the DB
    # is updated.  This means a process crash after rename but before commit
    # leaves an orphaned file (recoverable) rather than a committed broken URL
    # (data corruption).  If rename fails, no DB update is made at all.
    image_url = f"/photos/{filename}"
    try:
        os.rename(tmp_filepath, filepath)
    except OSError as exc:
        logger.error("Failed to rename temp seed image file %s → %s: %s", tmp_filepath, filepath, exc)
        try:
            os.unlink(tmp_filepath)
        except OSError as unlink_exc:
            logger.warning("Failed to clean up temp seed image file %s: %s", tmp_filepath, unlink_exc)
        raise HTTPException(500, "Failed to save image file") from exc
    db.execute("UPDATE seeds SET image_url = ?, image_locked = 1 WHERE id = ?", (image_url, seed_id))
    db.commit()
    return {"image_url": image_url}


def patch_seed_image_url(db: sqlite3.Connection, seed_id: str, data: ImageUrlPatch) -> dict:
    db.execute("UPDATE seeds SET image_url = ? WHERE id = ?", (data.image_url, seed_id))
    db.commit()
    return {"image_url": data.image_url}
