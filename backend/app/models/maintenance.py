import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class MaintenanceType(str, enum.Enum):
    fertilize = "fertilize"
    water = "water"
    prune = "prune"
    treat = "treat"
    observe = "observe"
    other = "other"


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    planting_event_id: Mapped[int] = mapped_column(ForeignKey("planting_events.id"), nullable=False)
    logged_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    event_type: Mapped[MaintenanceType] = mapped_column(
        Enum(MaintenanceType, name="maintenance_type"), nullable=False
    )
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    product_used: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    planting_event: Mapped["PlantingEvent"] = relationship(back_populates="maintenance_logs")  # noqa: F821


