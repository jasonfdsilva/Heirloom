import enum
from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class HarvestUnit(str, enum.Enum):
    count = "count"
    lbs = "lbs"
    oz = "oz"
    kg = "kg"
    g = "g"
    bunch = "bunch"


class HarvestRecord(Base):
    __tablename__ = "harvest_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    planting_event_id: Mapped[int] = mapped_column(ForeignKey("planting_events.id"), nullable=False)
    logged_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    harvested_at: Mapped[date] = mapped_column(Date, nullable=False)
    quantity: Mapped[float | None] = mapped_column(Float)
    unit: Mapped[HarvestUnit] = mapped_column(
        Enum(HarvestUnit, name="harvest_unit"), default=HarvestUnit.count
    )
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    planting_event: Mapped["PlantingEvent"] = relationship(back_populates="harvest_records")  # noqa: F821


