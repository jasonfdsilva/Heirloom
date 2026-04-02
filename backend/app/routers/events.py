import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from backend.app.database import get_db
from backend.app.schemas.event import EventCreate
from backend.app.services import event_service

router = APIRouter(tags=["events"])


@router.post("/api/plantings/{planting_id}/events")
def create_event(
    planting_id: int, data: EventCreate, db: sqlite3.Connection = Depends(get_db)
):
    existing = db.execute("SELECT id FROM plantings WHERE id = ?", (planting_id,)).fetchone()
    if not existing:
        raise HTTPException(404, "Planting not found")
    return event_service.create_event(db, planting_id, data)


@router.put("/api/events/{event_id}")
def update_event(event_id: int, data: EventCreate, db: sqlite3.Connection = Depends(get_db)):
    return event_service.update_event(db, event_id, data)


@router.delete("/api/events/{event_id}")
def delete_event(event_id: int, db: sqlite3.Connection = Depends(get_db)):
    return event_service.delete_event(db, event_id)
