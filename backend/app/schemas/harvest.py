from datetime import date, datetime

from pydantic import BaseModel

from app.models.harvest import HarvestUnit


class HarvestRecordCreate(BaseModel):
    planting_event_id: int
    harvested_at: date
    quantity: float | None = None
    unit: HarvestUnit = HarvestUnit.count
    notes: str | None = None


class HarvestRecordRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    planting_event_id: int
    logged_by_user_id: int
    harvested_at: date
    quantity: float | None
    unit: HarvestUnit
    notes: str | None
    created_at: datetime
