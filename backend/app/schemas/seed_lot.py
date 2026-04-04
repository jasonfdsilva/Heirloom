from typing import Optional
from pydantic import BaseModel


class SeedLotCreate(BaseModel):
    seed_id: str
    lot_code: Optional[str] = None  # auto-generated if omitted
    packed_for_year: Optional[int] = None
    purchased_year: Optional[int] = None
    supplier: Optional[str] = None
    supplier_lot: Optional[str] = None
    sku: Optional[str] = None
    germ_rate: Optional[float] = None
    notes: Optional[str] = None
    packet_image_url: Optional[str] = None


class SeedLotUpdate(BaseModel):
    lot_code: Optional[str] = None
    packed_for_year: Optional[int] = None
    purchased_year: Optional[int] = None
    supplier: Optional[str] = None
    supplier_lot: Optional[str] = None
    sku: Optional[str] = None
    germ_rate: Optional[float] = None
    notes: Optional[str] = None
    packet_image_url: Optional[str] = None


class PacketExtractResponse(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    supplier: Optional[str] = None
    supplier_lot: Optional[str] = None
    sku: Optional[str] = None
    packed_for_year: Optional[int] = None
    germ_rate: Optional[float] = None
    days_to_maturity: Optional[str] = None
    organic: Optional[bool] = None
    notes: Optional[str] = None
