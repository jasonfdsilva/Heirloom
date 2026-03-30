import enum

from sqlalchemy import Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class SpaceType(str, enum.Enum):
    raised_bed = "raised_bed"
    container = "container"


class GrowingSpace(Base):
    __tablename__ = "growing_spaces"

    id: Mapped[int] = mapped_column(primary_key=True)
    garden_id: Mapped[int] = mapped_column(ForeignKey("gardens.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[SpaceType] = mapped_column(
        Enum(SpaceType, name="space_type"), nullable=False, default=SpaceType.raised_bed
    )
    width_ft: Mapped[float | None] = mapped_column(Float)
    length_ft: Mapped[float | None] = mapped_column(Float)
    notes: Mapped[str | None] = mapped_column(Text)
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    garden: Mapped["Garden"] = relationship(back_populates="spaces")  # noqa: F821
    planting_events: Mapped[list["PlantingEvent"]] = relationship(back_populates="space")  # noqa: F821


