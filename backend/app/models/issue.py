import enum
from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class IssueType(str, enum.Enum):
    disease = "disease"
    pest = "pest"
    environmental = "environmental"
    other = "other"


class IssueSeverity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class IssueLog(Base):
    __tablename__ = "issue_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    planting_event_id: Mapped[int] = mapped_column(ForeignKey("planting_events.id"), nullable=False)
    logged_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    issue_type: Mapped[IssueType] = mapped_column(
        Enum(IssueType, name="issue_type"), nullable=False
    )
    name: Mapped[str | None] = mapped_column(String(255))
    severity: Mapped[IssueSeverity] = mapped_column(
        Enum(IssueSeverity, name="issue_severity"), nullable=False, default=IssueSeverity.low
    )
    occurred_at: Mapped[date] = mapped_column(Date, nullable=False)
    resolved_at: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    planting_event: Mapped["PlantingEvent"] = relationship(back_populates="issue_logs")  # noqa: F821


