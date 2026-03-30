from pydantic import BaseModel

from app.models.variety import PlantType


class VarietyCreate(BaseModel):
    common_name: str
    latin_name: str | None = None
    plant_type: PlantType = PlantType.annual
    days_to_germination: int | None = None
    days_to_maturity: str | None = None
    spacing_inches: float | None = None
    sow_depth_inches: float | None = None
    notes: str | None = None


class VarietyRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    common_name: str
    latin_name: str | None
    plant_type: PlantType
    days_to_germination: int | None
    days_to_maturity: str | None
    spacing_inches: float | None
    sow_depth_inches: float | None
    notes: str | None


class VarietyUpdate(BaseModel):
    common_name: str | None = None
    latin_name: str | None = None
    plant_type: PlantType | None = None
    days_to_germination: int | None = None
    days_to_maturity: str | None = None
    spacing_inches: float | None = None
    sow_depth_inches: float | None = None
    notes: str | None = None


# Returned by the seed packet extraction service
class SeedPacketExtraction(BaseModel):
    vendor: str | None = None
    product_category: str | None = None
    common_name: str
    latin_name: str | None = None
    sku: str | None = None
    lot_number: str | None = None
    min_seed_count: int | None = None
    seeds_per_pound: int | None = None
    days_to_maturity: str | None = None
    germination_rate_pct: int | None = None
    germination_test_date: str | None = None
    certifications: list[str] = []
    plant_variety_protected: bool = False
    special_notes: str | None = None
