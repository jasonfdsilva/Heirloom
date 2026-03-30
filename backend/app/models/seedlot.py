from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class SeedLot(Base):
    __tablename__ = "seed_lots"

    id: Mapped[int] = mapped_column(primary_key=True)
    variety_id: Mapped[int] = mapped_column(ForeignKey("plant_varieties.id"), nullable=False)
    lot_number: Mapped[str | None] = mapped_column(String(100))
    sku: Mapped[str | None] = mapped_column(String(100))
    source_vendor: Mapped[str | None] = mapped_column(String(255))
    purchase_date: Mapped[date | None] = mapped_column(Date)
    quantity_seeds: Mapped[int | None] = mapped_column(Integer)
    germination_rate_pct: Mapped[int | None] = mapped_column(Integer)
    germination_test_date: Mapped[str | None] = mapped_column(String(10))  # "MM/YY" as printed
    certifications: Mapped[str | None] = mapped_column(String(500))        # comma-separated
    packet_image_url: Mapped[str | None] = mapped_column(String(500))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    variety: Mapped["PlantVariety"] = relationship(back_populates="seed_lots")  # noqa: F821
    planting_events: Mapped[list["PlantingEvent"]] = relationship(back_populates="seed_lot")  # noqa: F821


