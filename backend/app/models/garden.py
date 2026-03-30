import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class MemberRole(str, enum.Enum):
    owner = "owner"
    editor = "editor"
    viewer = "viewer"


class Garden(Base):
    __tablename__ = "gardens"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location_description: Mapped[str | None] = mapped_column(Text)
    # Hardcoded defaults for zip 07922 (Zone 6b); editable per garden
    last_frost_date: Mapped[str] = mapped_column(String(5), default="04-23")   # MM-DD
    first_frost_date: Mapped[str] = mapped_column(String(5), default="10-22")  # MM-DD
    layout_pdf_url: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    memberships: Mapped[list["GardenMembership"]] = relationship(back_populates="garden")
    spaces: Mapped[list["GrowingSpace"]] = relationship(back_populates="garden")
    seasons: Mapped[list["GardenSeason"]] = relationship(back_populates="garden")
    expenses: Mapped[list["GardenExpense"]] = relationship(back_populates="garden")
    grow_light_configs: Mapped[list["GrowLightConfig"]] = relationship(back_populates="garden")


class GardenMembership(Base):
    __tablename__ = "garden_memberships"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    garden_id: Mapped[int] = mapped_column(ForeignKey("gardens.id"), nullable=False)
    role: Mapped[MemberRole] = mapped_column(
        Enum(MemberRole, name="member_role"), nullable=False, default=MemberRole.viewer
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship(back_populates="memberships")
    garden: Mapped["Garden"] = relationship(back_populates="memberships")
