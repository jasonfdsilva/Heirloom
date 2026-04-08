from typing import Literal, Optional
from pydantic import BaseModel

# Must stay in sync with EVENT_TYPES in frontend/src/lib/constants.js
EventType = Literal[
    'note', 'sowed_indoors', 'germinated', 'hardened', 'transplanted',
    'purchased', 'planted_out', 'harvested', 'issue', 'treatment', 'failed',
]


class EventCreate(BaseModel):
    event_date: str
    event_type: EventType = 'note'
    details: Optional[str] = None
    severity: Optional[str] = None
    product_used: Optional[str] = None
    quantity: Optional[int] = None


class BulkEventCreate(BaseModel):
    planting_ids: list[int]
    event_date: str
    event_type: EventType = 'note'
    details: Optional[str] = None
    severity: Optional[str] = None
    product_used: Optional[str] = None
