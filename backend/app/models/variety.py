import enum

from sqlalchemy import Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class PlantType(str, enum.Enum):
    annual = "annual"
    perennial = "perennial"
    biennial = "biennial"


class PlantVariety(Base):
    __tablename__ = "plant_varieties"

    id: Mapped[int] = mapped_column(primary_key=True)
    common_name: Mapped[str] = mapped_column(String(255), nullable=False)
    latin_name: Mapped[str | None] = mapped_column(String(255))
    plant_type: Mapped[PlantType] = mapped_column(
        Enum(PlantType, name="plant_type"), default=PlantType.annual
    )
    days_to_germination: Mapped[int | None] = mapped_column(Integer)
    days_to_maturity: Mapped[str | None] = mapped_column(String(50))  # "75" or "50 green/70 red"
    spacing_inches: Mapped[float | None] = mapped_column(Float)
    sow_depth_inches: Mapped[float | None] = mapped_column(Float)
    notes: Mapped[str | None] = mapped_column(Text)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))

    seed_lots: Mapped[list["SeedLot"]] = relationship(back_populates="variety")  # noqa: F821
    planting_events: Mapped[list["PlantingEvent"]] = relationship(back_populates="variety")  # noqa: F821


