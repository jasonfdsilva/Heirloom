from datetime import date, datetime

from pydantic import BaseModel


class SeedLotCreate(BaseModel):
    variety_id: int
    lot_number: str | None = None
    sku: str | None = None
    source_vendor: str | None = None
    purchase_date: date | None = None
    quantity_seeds: int | None = None
    germination_rate_pct: int | None = None
    germination_test_date: str | None = None
    certifications: str | None = None
    notes: str | None = None


class SeedLotRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    variety_id: int
    lot_number: str | None
    sku: str | None
    source_vendor: str | None
    purchase_date: date | None
    quantity_seeds: int | None
    germination_rate_pct: int | None
    germination_test_date: str | None
    certifications: str | None
    packet_image_url: str | None
    notes: str | None
    created_at: datetime


class SeedLotUpdate(BaseModel):
    lot_number: str | None = None
    sku: str | None = None
    source_vendor: str | None = None
    purchase_date: date | None = None
    quantity_seeds: int | None = None
    germination_rate_pct: int | None = None
    germination_test_date: str | None = None
    certifications: str | None = None
    notes: str | None = None
