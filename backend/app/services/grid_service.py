import logging
import sqlite3
import uuid

from fastapi import HTTPException

from backend.app.database import seed_prefix
from backend.app.schemas.grid import GridUpdate

logger = logging.getLogger(__name__)


def get_grid(db: sqlite3.Connection, structure_id: str) -> list:
    rows = db.execute("""
        SELECT gc.row, gc.col, gc.planting_id, gc.plant_guid, gc.short_id,
               gc.plant_status, gc.plant_notes, gc.label_visible,
               p.seed_id, s.name as seed_name, s.short_label, s.category, s.spacing_inches
        FROM grid_cells gc
        JOIN plantings p ON gc.planting_id = p.id
        JOIN seeds s ON p.seed_id = s.id
        WHERE gc.structure_id = ?
    """, (structure_id,)).fetchall()
    return [dict(r) for r in rows]


def update_grid(db: sqlite3.Connection, structure_id: str, data: GridUpdate) -> dict:
    structure = db.execute(
        "SELECT width, length FROM structures WHERE id = ?", (structure_id,)
    ).fetchone()
    if not structure:
        raise HTTPException(status_code=404, detail="Structure not found")

    # Grid uses 6-inch cells: a 4-ft-wide structure has 4×12/6 = 8 columns.
    # Must match the frontend CELL_SIZE = 6 constant in BedPlanner.jsx / GardenMap.jsx.
    _CELL_INCHES = 6
    max_col = int(structure["width"] * 12 / _CELL_INCHES) - 1
    max_row = int(structure["length"] * 12 / _CELL_INCHES) - 1
    for cell in data.cells:
        r, c = cell["row"], cell["col"]
        if r < 0 or r > max_row or c < 0 or c > max_col:
            raise HTTPException(
                status_code=400,
                detail=f"Cell ({r}, {c}) is out of bounds for this structure "
                       f"(max row {max_row}, max col {max_col})",
            )

    row_seed = db.execute(
        "SELECT s.name FROM plantings p JOIN seeds s ON p.seed_id = s.id WHERE p.id = ?",
        (data.planting_id,)
    ).fetchone()
    prefix = seed_prefix(row_seed["name"]) if row_seed else "XX"

    for cell in data.cells:
        existing = db.execute(
            "SELECT id, planting_id FROM grid_cells WHERE structure_id = ? AND row = ? AND col = ?",
            (structure_id, cell["row"], cell["col"])
        ).fetchone()
        if existing and existing["planting_id"] == data.planting_id:
            continue
        count = db.execute(
            "SELECT COUNT(*) FROM grid_cells WHERE planting_id = ? AND plant_guid IS NOT NULL",
            (data.planting_id,)
        ).fetchone()[0]
        new_guid = str(uuid.uuid4())
        new_short = f"{prefix}-{count + 1:02d}"
        try:
            db.execute(
                """INSERT INTO grid_cells
                   (planting_id, structure_id, row, col, plant_guid, short_id, plant_status, label_visible)
                   VALUES (?,?,?,?,?,?,'healthy',1)
                   ON CONFLICT(structure_id, row, col) DO UPDATE SET
                       planting_id=excluded.planting_id,
                       plant_guid=excluded.plant_guid,
                       short_id=excluded.short_id,
                       plant_status='healthy',
                       plant_notes=NULL,
                       label_visible=1""",
                (data.planting_id, structure_id, cell["row"], cell["col"], new_guid, new_short)
            )
        except Exception as exc:  # noqa: BLE001 — swallow to keep painter UX smooth
            logger.warning("grid INSERT failed for cell (%s,%s): %s", cell["row"], cell["col"], exc)
    db.commit()
    return {"message": "Grid updated", "cell_count": len(data.cells)}


def delete_grid_cells(
    db: sqlite3.Connection,
    structure_id: str,
    planting_id: int,
    rows: str = "",
    cols: str = "",
) -> dict:
    if rows and cols:
        row_list = [int(r) for r in rows.split(",")]
        col_list = [int(c) for c in cols.split(",")]
        for r, c in zip(row_list, col_list):
            db.execute(
                "DELETE FROM grid_cells WHERE structure_id = ? AND row = ? AND col = ?",
                (structure_id, r, c)
            )
    else:
        db.execute(
            "DELETE FROM grid_cells WHERE structure_id = ? AND planting_id = ?",
            (structure_id, planting_id)
        )
    total = db.execute(
        "SELECT COUNT(*) FROM grid_cells WHERE planting_id = ?", (planting_id,)
    ).fetchone()[0]
    db.execute("UPDATE plantings SET quantity = ? WHERE id = ?", (total, planting_id))
    db.commit()
    return {"message": "Cells removed"}
