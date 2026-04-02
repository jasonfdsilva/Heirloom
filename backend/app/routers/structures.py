import sqlite3

from fastapi import APIRouter, Depends

from backend.app.database import get_db

router = APIRouter(prefix="/api/structures", tags=["structures"])


@router.get("")
def list_structures(db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute("SELECT * FROM structures ORDER BY name").fetchall()
    return [dict(r) for r in rows]
