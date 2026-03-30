import enum
from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class ExpenseCategory(str, enum.Enum):
    seeds = "seeds"
    plants_transplants = "plants_transplants"
    soil_amendments = "soil_amendments"
    fertilizer = "fertilizer"
    tools_equipment = "tools_equipment"
    containers = "containers"
    pest_disease_control = "pest_disease_control"
    other = "other"


class GardenExpense(Base):
    __tablename__ = "garden_expenses"

    id: Mapped[int] = mapped_column(primary_key=True)
    garden_id: Mapped[int] = mapped_column(ForeignKey("gardens.id"), nullable=False)
    season_id: Mapped[int | None] = mapped_column(ForeignKey("garden_seasons.id"))
    logged_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    amount_usd: Mapped[float] = mapped_column(Float, nullable=False)
    category: Mapped[ExpenseCategory] = mapped_column(
        Enum(ExpenseCategory, name="expense_category"), nullable=False
    )
    vendor: Mapped[str | None] = mapped_column(String(255))
    purchased_at: Mapped[date | None] = mapped_column(Date)
    receipt_url: Mapped[str | None] = mapped_column(String(500))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    garden: Mapped["Garden"] = relationship(back_populates="expenses")  # noqa: F821
    season: Mapped["GardenSeason | None"] = relationship(back_populates="expenses")  # noqa: F821


