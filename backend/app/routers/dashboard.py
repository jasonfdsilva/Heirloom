import sqlite3

from fastapi import APIRouter, Depends

from backend.app.database import get_db
from backend.app.services import dashboard_service

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/activity")
def get_recent_activity(db: sqlite3.Connection = Depends(get_db)):
    return dashboard_service.get_recent_activity(db)
