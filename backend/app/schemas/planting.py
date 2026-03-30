from datetime import date, datetime

from pydantic import BaseModel

from app.models.planting import PlantingStatus, SowType


class PlantingCreate(BaseModel):
    season_id: int
    variety_id: int
    seed_lot_id: int | None = None
    space_id: int
    location_note: str | None = None
    sow_type: SowType = SowType.direct
    planned_sow_date: date | None = None
    planned_transplant_date: date | None = None
    planned_harvest_start: date | None = None
    quantity_planted: int | None = None
    notes: str | None = None


class PlantingRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    season_id: int
    variety_id: int
    seed_lot_id: int | None
    space_id: int
    location_note: str | None
    sow_type: SowType
    status: PlantingStatus
    planned_sow_date: date | None
    planned_transplant_date: date | None
    planned_harvest_start: date | None
    actual_sow_date: date | None
    actual_transplant_date: date | None
    end_date: date | None
    quantity_planted: int | None
    notes: str | None
    created_at: datetime


class PlantingUpdate(BaseModel):
    seed_lot_id: int | None = None
    space_id: int | None = None
    location_note: str | None = None
    sow_type: SowType | None = None
    status: PlantingStatus | None = None
    planned_sow_date: date | None = None
    planned_transplant_date: date | None = None
    planned_harvest_start: date | None = None
    actual_sow_date: date | None = None
    actual_transplant_date: date | None = None
    end_date: date | None = None
    quantity_planted: int | None = None
    notes: str | None = None
