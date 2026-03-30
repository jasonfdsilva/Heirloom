from datetime import datetime

from pydantic import BaseModel

from app.models.garden import MemberRole


class GardenCreate(BaseModel):
    name: str
    location_description: str | None = None
    last_frost_date: str = "04-23"
    first_frost_date: str = "10-22"


class GardenRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    location_description: str | None
    last_frost_date: str
    first_frost_date: str
    layout_pdf_url: str | None
    created_at: datetime


class GardenUpdate(BaseModel):
    name: str | None = None
    location_description: str | None = None
    last_frost_date: str | None = None
    first_frost_date: str | None = None


class MembershipRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    user_id: int
    garden_id: int
    role: MemberRole


class InviteCreate(BaseModel):
    email: str
    role: MemberRole = MemberRole.viewer
