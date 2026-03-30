import enum
from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class TrayType(str, enum.Enum):
    cell_32 = "cell_32"
    plug_72 = "plug_72"


class GrowLightConfig(Base):
    __tablename__ = "grow_light_configs"

    id: Mapped[int] = mapped_column(primary_key=True)
    garden_id: Mapped[int] = mapped_column(ForeignKey("gardens.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False, default="Grow Light Setup")
    total_tray_capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=8)
    notes: Mapped[str | None] = mapped_column(Text)

    garden: Mapped["Garden"] = relationship(back_populates="grow_light_configs")  # noqa: F821
    assignments: Mapped[list["GrowLightAssignment"]] = relationship(back_populates="config")


class GrowLightAssignment(Base):
    __tablename__ = "grow_light_assignments"

    id: Mapped[int] = mapped_column(primary_key=True)
    config_id: Mapped[int] = mapped_column(ForeignKey("grow_light_configs.id"), nullable=False)
    planting_event_id: Mapped[int] = mapped_column(ForeignKey("planting_events.id"), nullable=False)
    tray_type: Mapped[TrayType] = mapped_column(
        Enum(TrayType, name="tray_type"), nullable=False, default=TrayType.cell_32
    )
    tray_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    placed_date: Mapped[date | None] = mapped_column(Date)
    removed_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    config: Mapped["GrowLightConfig"] = relationship(back_populates="assignments")
    planting_event: Mapped["PlantingEvent"] = relationship(back_populates="grow_light_assignments")  # noqa: F821


