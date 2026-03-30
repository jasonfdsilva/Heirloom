from datetime import date, datetime

from pydantic import BaseModel

from app.models.expense import ExpenseCategory


class ExpenseCreate(BaseModel):
    season_id: int | None = None
    description: str
    amount_usd: float
    category: ExpenseCategory
    vendor: str | None = None
    purchased_at: date | None = None
    notes: str | None = None


class ExpenseRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    garden_id: int
    season_id: int | None
    logged_by_user_id: int
    description: str
    amount_usd: float
    category: ExpenseCategory
    vendor: str | None
    purchased_at: date | None
    receipt_url: str | None
    notes: str | None
    created_at: datetime


class ExpenseUpdate(BaseModel):
    description: str | None = None
    amount_usd: float | None = None
    category: ExpenseCategory | None = None
    vendor: str | None = None
    purchased_at: date | None = None
    notes: str | None = None
