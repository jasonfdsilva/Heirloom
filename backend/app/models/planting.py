import enum
from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class SowType(str, enum.Enum):
    direct = "direct"
    indoor_start = "indoor_start"


class PlantingStatus(str, enum.Enum):
    planned = "planned"
    active = "active"
    harvested = "harvested"
    done = "done"
    failed = "failed"


class PlantingEvent(Base):
    __tablename__ = "planting_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("garden_seasons.id"), nullable=False)
    variety_id: Mapped[int] = mapped_column(ForeignKey("plant_varieties.id"), nullable=False)
    seed_lot_id: Mapped[int | None] = mapped_column(ForeignKey("seed_lots.id"))
    space_id: Mapped[int] = mapped_column(ForeignKey("growing_spaces.id"), nullable=False)
    location_note: Mapped[str | None] = mapped_column(String(255))  # e.g. "north end, row 1"

    sow_type: Mapped[SowType] = mapped_column(
        Enum(SowType, name="sow_type"), nullable=False, default=SowType.direct
    )
    status: Mapped[PlantingStatus] = mapped_column(
        Enum(PlantingStatus, name="planting_status"), nullable=False, default=PlantingStatus.planned
    )

    # Planned dates (calculated from frost dates at creation)
    planned_sow_date: Mapped[date | None] = mapped_column(Date)
    planned_transplant_date: Mapped[date | None] = mapped_column(Date)
    planned_harvest_start: Mapped[date | None] = mapped_column(Date)

    # Actual dates (filled in as they happen)
    actual_sow_date: Mapped[date | None] = mapped_column(Date)
    actual_transplant_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)

    quantity_planted: Mapped[int | None] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    season: Mapped["GardenSeason"] = relationship(back_populates="planting_events")  # noqa: F821
    variety: Mapped["PlantVariety"] = relationship(back_populates="planting_events")  # noqa: F821
    seed_lot: Mapped["SeedLot | None"] = relationship(back_populates="planting_events")  # noqa: F821
    space: Mapped["GrowingSpace"] = relationship(back_populates="planting_events")  # noqa: F821
    maintenance_logs: Mapped[list["MaintenanceLog"]] = relationship(back_populates="planting_event")  # noqa: F821
    issue_logs: Mapped[list["IssueLog"]] = relationship(back_populates="planting_event")  # noqa: F821
    harvest_records: Mapped[list["HarvestRecord"]] = relationship(back_populates="planting_event")  # noqa: F821
    photos: Mapped[list["PlantPhoto"]] = relationship(back_populates="planting_event")  # noqa: F821
    grow_light_assignments: Mapped[list["GrowLightAssignment"]] = relationship(back_populates="planting_event")  # noqa: F821


