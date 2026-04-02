from pydantic import BaseModel


class GridUpdate(BaseModel):
    planting_id: int
    cells: list  # list of {"row": int, "col": int}
