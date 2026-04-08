import sqlite3
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form

from backend.app.database import get_db
from backend.app.services import photo_service

router = APIRouter(tags=["photos"])


@router.get("/api/plantings/{planting_id}/photos")
def list_photos(planting_id: int, db: sqlite3.Connection = Depends(get_db)):
    return photo_service.list_photos(db, planting_id)


@router.get("/api/photos")
def list_all_photos(db: sqlite3.Connection = Depends(get_db)):
    return photo_service.list_all_photos(db)


@router.post("/api/plantings/{planting_id}/photos")
async def upload_photo(
    planting_id: int,
    file: UploadFile = File(...),
    caption: str = Form(""),
    taken_date: str = Form(""),
    event_id: str = Form(""),
    db: sqlite3.Connection = Depends(get_db),
):
    existing = db.execute("SELECT id FROM plantings WHERE id = ?", (planting_id,)).fetchone()
    if not existing:
        raise HTTPException(404, "Planting not found")
    content = await file.read()
    return photo_service.upload_photo(
        db, planting_id, file.filename or "", content, caption, taken_date, event_id
    )


@router.post("/api/photos/link")
def link_photo(
    filename: str = Form(...),
    original_name: str = Form(""),
    planting_id: int = Form(...),
    event_id: Optional[int] = Form(None),
    caption: str = Form(""),
    taken_date: str = Form(""),
    db: sqlite3.Connection = Depends(get_db),
):
    existing = db.execute("SELECT id FROM plantings WHERE id = ?", (planting_id,)).fetchone()
    if not existing:
        raise HTTPException(404, "Planting not found")
    return photo_service.link_photo(db, filename, original_name, planting_id, event_id, caption, taken_date)


@router.delete("/api/photos/{photo_id}")
def delete_photo(photo_id: int, db: sqlite3.Connection = Depends(get_db)):
    return photo_service.delete_photo(db, photo_id)


@router.get("/api/plants/{plant_guid}/photos")
def list_plant_photos(plant_guid: str, db: sqlite3.Connection = Depends(get_db)):
    return photo_service.list_plant_photos(db, plant_guid)


@router.post("/api/plants/{plant_guid}/photos")
async def upload_plant_photo(
    plant_guid: str,
    file: UploadFile = File(...),
    planting_id: int = Form(...),
    caption: str = Form(""),
    taken_date: str = Form(""),
    db: sqlite3.Connection = Depends(get_db),
):
    cell = db.execute(
        "SELECT id FROM grid_cells WHERE plant_guid = ?", (plant_guid,)
    ).fetchone()
    if not cell:
        raise HTTPException(404, "Plant not found")
    content = await file.read()
    return photo_service.upload_plant_photo(
        db, plant_guid, planting_id, file.filename or "", content, caption, taken_date
    )
