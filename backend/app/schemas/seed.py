from typing import Optional
from pydantic import BaseModel


class SeedCreate(BaseModel):
    name: str
    category: str
    variety: Optional[str] = None
    species: Optional[str] = None
    days_to_maturity: Optional[str] = None
    germ_rate: Optional[float] = None
    lot: Optional[str] = None
    sku: Optional[str] = None
    organic: bool = False
    supplier: Optional[str] = None
    min_seeds: Optional[int] = None
    start_indoors: bool = False
    direct_sow: bool = False
    suggested_indoor_weeks: int = 0
    spacing_inches: int = 12
    image_url: Optional[str] = None
    short_label: Optional[str] = None
    notes: Optional[str] = None


class ImageUrlPatch(BaseModel):
    image_url: Optional[str] = None
