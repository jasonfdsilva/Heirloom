from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class GardenSeason(Base):
    __tablename__ = "garden_seasons"

    id: Mapped[int] = mapped_column(primary_key=True)
    garden_id: Mapped[int] = mapped_column(ForeignKey("gardens.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)   # e.g. "2026 Season"
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    delay_weeks: Mapped[int] = mapped_column(Integer, default=0)
    delay_reason: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    garden: Mapped["Garden"] = relationship(back_populates="seasons")  # noqa: F821
    planting_events: Mapped[list["PlantingEvent"]] = relationship(back_populates="season")  # noqa: F821
    expenses: Mapped[list["GardenExpense"]] = relationship(back_populates="season")  # noqa: F821


