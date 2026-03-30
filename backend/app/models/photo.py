from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class PlantPhoto(Base):
    __tablename__ = "plant_photos"

    id: Mapped[int] = mapped_column(primary_key=True)
    planting_event_id: Mapped[int] = mapped_column(ForeignKey("planting_events.id"), nullable=False)
    uploaded_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    storage_url: Mapped[str] = mapped_column(String(500), nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(String(500))
    caption: Mapped[str | None] = mapped_column(Text)
    taken_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    planting_event: Mapped["PlantingEvent"] = relationship(back_populates="photos")  # noqa: F821


