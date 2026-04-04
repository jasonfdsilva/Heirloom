import sqlite3

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from backend.app.database import get_db
from backend.app.schemas.seed_lot import SeedLotCreate, SeedLotUpdate, PacketExtractResponse
from backend.app.services import seed_lot_service

router = APIRouter(prefix="/api/seed-lots", tags=["seed_lots"])


@router.get("")
def list_lots(db: sqlite3.Connection = Depends(get_db)):
    return seed_lot_service.list_lots(db)


# NOTE: generate-code and extract-packet MUST be declared before /{lot_id}
# so FastAPI doesn't try to cast the literal strings as integers.

@router.get("/generate-code")
def generate_code(seed_id: str, year: int, db: sqlite3.Connection = Depends(get_db)):
    seed = db.execute("SELECT id FROM seeds WHERE id = ?", (seed_id,)).fetchone()
    if not seed:
        raise HTTPException(404, "Seed not found")
    code = seed_lot_service.generate_lot_code(db, seed_id, year)
    return {"lot_code": code}


@router.post("/extract-packet", response_model=PacketExtractResponse)
async def extract_packet(file: UploadFile = File(...)):
    content = await file.read()
    mime_type = file.content_type or "image/jpeg"
    try:
        data = seed_lot_service.extract_packet_data(content, mime_type)
    except Exception as exc:
        raise HTTPException(422, f"Extraction failed: {exc}") from exc
    return data


@router.post("")
def create_lot(data: SeedLotCreate, db: sqlite3.Connection = Depends(get_db)):
    try:
        lot = seed_lot_service.create_lot(db, data)
    except ValueError as exc:
        msg = str(exc)
        if "not found" in msg:
            raise HTTPException(404, msg) from exc
        raise HTTPException(400, msg) from exc
    except Exception as exc:
        # UNIQUE constraint violation → 409
        if "UNIQUE" in str(exc):
            raise HTTPException(409, "Lot code already exists") from exc
        raise HTTPException(400, str(exc)) from exc
    return lot


@router.put("/{lot_id}")
def update_lot(lot_id: int, data: SeedLotUpdate, db: sqlite3.Connection = Depends(get_db)):
    existing = db.execute("SELECT id FROM seed_lots WHERE id = ?", (lot_id,)).fetchone()
    if not existing:
        raise HTTPException(404, "Lot not found")
    try:
        return seed_lot_service.update_lot(db, lot_id, data)
    except Exception as exc:
        if "UNIQUE" in str(exc):
            raise HTTPException(409, "Lot code already exists") from exc
        raise HTTPException(400, str(exc)) from exc


@router.delete("/{lot_id}")
def delete_lot(lot_id: int, db: sqlite3.Connection = Depends(get_db)):
    deleted = seed_lot_service.delete_lot(db, lot_id)
    if not deleted:
        raise HTTPException(404, "Lot not found")
    return {"message": "Deleted"}
