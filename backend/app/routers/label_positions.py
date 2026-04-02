import sqlite3
from typing import List

from fastapi import APIRouter, Depends

from backend.app.database import get_db
from backend.app.schemas.label import LabelPosition
from backend.app.services import label_service

router = APIRouter(prefix="/api/label-positions", tags=["label_positions"])


@router.get("")
def get_label_positions(db: sqlite3.Connection = Depends(get_db)):
    return label_service.get_label_positions(db)


@router.put("")
def save_label_positions(
    positions: List[LabelPosition], db: sqlite3.Connection = Depends(get_db)
):
    return label_service.save_label_positions(db, positions)
