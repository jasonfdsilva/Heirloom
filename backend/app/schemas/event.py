from typing import Optional
from pydantic import BaseModel


class EventCreate(BaseModel):
    event_date: str
    event_type: str
    details: Optional[str] = None
    severity: Optional[str] = None
    product_used: Optional[str] = None
    quantity: Optional[int] = None
