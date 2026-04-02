from typing import Optional
from pydantic import BaseModel


class LabelPosition(BaseModel):
    entity_type: str
    entity_id: str
    label_x: float
    label_y: float
    orientation: str = "horizontal"
    hidden: bool = False
    label_text: Optional[str] = None
