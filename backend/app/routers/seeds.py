import sqlite3

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from backend.app.database import get_db
from backend.app.schemas.seed import SeedCreate, ImageUrlPatch
from backend.app.services import seed_service

router = APIRouter(prefix="/api/seeds", tags=["seeds"])


@router.get("")
def list_seeds(db: sqlite3.Connection = Depends(get_db)):
    return seed_service.list_seeds(db)


@router.post("")
def create_seed(data: SeedCreate, db: sqlite3.Connection = Depends(get_db)):
    return seed_service.create_seed(db, data)


@router.get("/image-search")
def seed_image_search(
    q: str,
    common_name: str = None,
    species: str = None,
    category: str = None,
):
    return seed_service.search_image(q, common_name=common_name, species=species, category=category)


@router.post("/fetch-images")
def fetch_all_images(db: sqlite3.Connection = Depends(get_db)):
    return seed_service.fetch_all_images(db)


@router.get("/{seed_id}/suggest-common-name")
def suggest_common_name(seed_id: str, db: sqlite3.Connection = Depends(get_db)):
    seed = db.execute("SELECT name, category, species FROM seeds WHERE id = ?", (seed_id,)).fetchone()
    if not seed:
        raise HTTPException(404, "Seed not found")
    result = seed_service.suggest_common_name(seed["name"], seed["category"], seed["species"])
    return {"common_name": result}


@router.put("/{seed_id}")
def update_seed(seed_id: str, data: SeedCreate, db: sqlite3.Connection = Depends(get_db)):
    existing = db.execute("SELECT id FROM seeds WHERE id = ?", (seed_id,)).fetchone()
    if not existing:
        raise HTTPException(404, "Seed not found")
    return seed_service.update_seed(db, seed_id, data)


@router.patch("/{seed_id}/label")
def patch_seed_label(seed_id: str, data: dict, db: sqlite3.Connection = Depends(get_db)):
    return seed_service.patch_seed_label(db, seed_id, data.get("short_label"))


@router.post("/{seed_id}/image")
async def upload_seed_image(
    seed_id: str,
    file: UploadFile = File(...),
    db: sqlite3.Connection = Depends(get_db),
):
    existing = db.execute("SELECT id FROM seeds WHERE id = ?", (seed_id,)).fetchone()
    if not existing:
        raise HTTPException(404, "Seed not found")
    content = await file.read()
    return seed_service.upload_seed_image(db, seed_id, file.filename or "", content)


@router.patch("/{seed_id}/image")
def patch_seed_image_url(
    seed_id: str, data: ImageUrlPatch, db: sqlite3.Connection = Depends(get_db)
):
    return seed_service.patch_seed_image_url(db, seed_id, data)
