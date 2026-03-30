from pydantic import BaseModel

from app.models.space import SpaceType


class SpaceCreate(BaseModel):
    name: str
    type: SpaceType = SpaceType.raised_bed
    width_ft: float | None = None
    length_ft: float | None = None
    notes: str | None = None
    display_order: int = 0


class SpaceRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    garden_id: int
    name: str
    type: SpaceType
    width_ft: float | None
    length_ft: float | None
    notes: str | None
    display_order: int


class SpaceUpdate(BaseModel):
    name: str | None = None
    type: SpaceType | None = None
    width_ft: float | None = None
    length_ft: float | None = None
    notes: str | None = None
    display_order: int | None = None
