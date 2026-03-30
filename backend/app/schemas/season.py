from datetime import datetime

from pydantic import BaseModel


class SeasonCreate(BaseModel):
    name: str
    year: int
    notes: str | None = None


class SeasonRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    garden_id: int
    name: str
    year: int
    delay_weeks: int
    delay_reason: str | None
    notes: str | None
    created_at: datetime


class SeasonUpdate(BaseModel):
    name: str | None = None
    delay_weeks: int | None = None
    delay_reason: str | None = None
    notes: str | None = None
