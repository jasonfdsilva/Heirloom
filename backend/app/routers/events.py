import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from backend.app.database import get_db
from backend.app.schemas.event import BulkEventCreate, EventCreate
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


@router.post("/api/events/bulk")
def create_bulk_events(data: BulkEventCreate, db: sqlite3.Connection = Depends(get_db)):
    if not data.planting_ids:
        raise HTTPException(422, "No planting IDs provided")
    for pid in data.planting_ids:
        if not db.execute("SELECT id FROM plantings WHERE id = ?", (pid,)).fetchone():
            raise HTTPException(404, f"Planting {pid} not found")
    return event_service.create_bulk_events(db, data.planting_ids, data)
