import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.app.database import get_db
from backend.app.schemas.planting import PlantingCreate, PlantingUpdate, FamilyNotesUpdate
from backend.app.services import planting_service

router = APIRouter(prefix="/api/plantings", tags=["plantings"])


@router.get("")
def list_plantings(year: int = 2026, db: sqlite3.Connection = Depends(get_db)):
    return planting_service.list_plantings(db, year)


@router.post("")
def create_planting(data: PlantingCreate, db: sqlite3.Connection = Depends(get_db)):
    seed = db.execute("SELECT id FROM seeds WHERE id = ?", (data.seed_id,)).fetchone()
    if not seed:
        raise HTTPException(404, "Seed not found")
    return planting_service.create_planting(db, data)


@router.post("/{planting_id}/duplicate")
def duplicate_planting(planting_id: int, db: sqlite3.Connection = Depends(get_db)):
    existing = db.execute("SELECT id FROM plantings WHERE id = ?", (planting_id,)).fetchone()
    if not existing:
        raise HTTPException(404, "Planting not found")
    return planting_service.duplicate_planting(db, planting_id)


@router.put("/{planting_id}")
def update_planting(
    planting_id: int, data: PlantingUpdate, db: sqlite3.Connection = Depends(get_db)
):
    existing = db.execute("SELECT id FROM plantings WHERE id = ?", (planting_id,)).fetchone()
    if not existing:
        raise HTTPException(404, "Planting not found")
    return planting_service.update_planting(db, planting_id, data)


@router.delete("/{planting_id}")
def delete_planting(planting_id: int, db: sqlite3.Connection = Depends(get_db)):
    return planting_service.delete_planting(db, planting_id)


@router.patch("/{planting_id}/family-notes")
def update_family_notes(
    planting_id: int, data: FamilyNotesUpdate, db: sqlite3.Connection = Depends(get_db)
):
    existing = db.execute("SELECT id FROM plantings WHERE id = ?", (planting_id,)).fetchone()
    if not existing:
        raise HTTPException(404, "Planting not found")
    return planting_service.update_family_notes(db, planting_id, data)
