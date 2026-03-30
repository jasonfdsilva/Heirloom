from datetime import datetime

from pydantic import BaseModel

from app.models.maintenance import MaintenanceType


class MaintenanceLogCreate(BaseModel):
    planting_event_id: int
    event_type: MaintenanceType
    occurred_at: datetime
    product_used: str | None = None
    notes: str | None = None


class MaintenanceLogRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    planting_event_id: int
    logged_by_user_id: int
    event_type: MaintenanceType
    occurred_at: datetime
    product_used: str | None
    notes: str | None
    created_at: datetime
