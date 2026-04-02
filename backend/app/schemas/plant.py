from typing import Optional
from pydantic import BaseModel


class PlantUpdate(BaseModel):
    plant_status: Optional[str] = None
    plant_notes: Optional[str] = None
    label_visible: Optional[bool] = None


class HarvestCreate(BaseModel):
    harvest_date: str
    weight_oz: Optional[float] = None
    count: Optional[int] = None
    notes: Optional[str] = None
