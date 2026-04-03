import sqlite3

from fastapi import APIRouter, Depends, Query

from backend.app.database import get_db
from backend.app.schemas.grid import GridUpdate
from backend.app.services import grid_service

router = APIRouter(tags=["grid"])


@router.get("/api/structures/{structure_id}/grid")
def get_grid(structure_id: str, db: sqlite3.Connection = Depends(get_db)):
    return grid_service.get_grid(db, structure_id)


@router.post("/api/structures/{structure_id}/grid")
def update_grid(
    structure_id: str, data: GridUpdate, db: sqlite3.Connection = Depends(get_db)
):
    return grid_service.update_grid(db, structure_id, data)


@router.delete("/api/structures/{structure_id}/grid/cells")
def delete_grid_cells(
    structure_id: str,
    planting_id: int = Query(...),
    rows: str = Query(""),
    cols: str = Query(""),
    db: sqlite3.Connection = Depends(get_db),
):
    return grid_service.delete_grid_cells(db, structure_id, planting_id, rows, cols)
