from typing import Optional
from pydantic import BaseModel


class PlantingCreate(BaseModel):
    seed_id: str
    structure_id: Optional[str] = None
    year: int = 2026
    qty_started: Optional[int] = None
    qty_planted: Optional[int] = None
    indoor_start_date: Optional[str] = None
    hardening_date: Optional[str] = None
    transplant_date: Optional[str] = None
    direct_sow_date: Optional[str] = None
    method: str = 'indoors'
    purchased_date: Optional[str] = None
    planted_out_date: Optional[str] = None
    first_harvest_date: Optional[str] = None
    status: str = "planned"
    notes: Optional[str] = None
    seed_lot_id: Optional[int] = None


class PlantingUpdate(BaseModel):
    structure_id: Optional[str] = None
    qty_started: Optional[int] = None
    qty_planted: Optional[int] = None
    indoor_start_date: Optional[str] = None
    hardening_date: Optional[str] = None
    transplant_date: Optional[str] = None
    direct_sow_date: Optional[str] = None
    method: Optional[str] = None
    purchased_date: Optional[str] = None
    planted_out_date: Optional[str] = None
    first_harvest_date: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    seed_lot_id: Optional[int] = None


class FamilyNotesUpdate(BaseModel):
    notes: Optional[str] = None
