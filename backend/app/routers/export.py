import sqlite3

from fastapi import APIRouter, Depends

from backend.app.database import get_db
from backend.app.services import export_service

router = APIRouter(tags=["export"])


@router.get("/api/export")
def export_data(db: sqlite3.Connection = Depends(get_db)):
    return export_service.export_data(db)


@router.post("/api/import")
def import_data(data: dict, db: sqlite3.Connection = Depends(get_db)):
    return export_service.import_data(db, data)
