from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Boolean, Text,
    DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///app/data/heirloom.db")
engine = create_engine(DATABASE_URL.replace("sqlite:", "sqlite+aiosqlite:"), echo=False)

Base = declarative_base()


class Seed(Base):
    __tablename__ = "seeds"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    variety = Column(String)
    category = Column(String, nullable=False)
    species = Column(String)
    days_to_maturity = Column(String)
    germ_rate = Column(Float)
    lot = Column(String)
    sku = Column(String)
    organic = Column(Boolean, default=False)
    supplier = Column(String)
    min_seeds = Column(Integer)
    start_indoors = Column(Boolean, default=False)
    direct_sow = Column(Boolean, default=False)
    suggested_indoor_weeks = Column(Integer, default=0)
    notes = Column(Text)

    plantings = relationship("Planting", back_populates="seed")


class Structure(Base):
    __tablename__ = "structures"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # bed or box
    width = Column(Float, nullable=False)
    length = Column(Float, nullable=False)
    map_x = Column(Float)
    map_y = Column(Float)

    plantings = relationship("Planting", back_populates="structure")


class Planting(Base):
    __tablename__ = "plantings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    seed_id = Column(String, ForeignKey("seeds.id"), nullable=False)
    structure_id = Column(String, ForeignKey("structures.id"))
    year = Column(Integer, default=2026)
    quantity = Column(Integer)

    # Key dates
    indoor_start_date = Column(String)
    hardening_date = Column(String)
    transplant_date = Column(String)
    direct_sow_date = Column(String)
    first_harvest_date = Column(String)

    # Status
    status = Column(String, default="planned")  # planned, started, hardening, transplanted, growing, harvesting, done

    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    seed = relationship("Seed", back_populates="plantings")
    structure = relationship("Structure", back_populates="plantings")
    events = relationship("PlantingEvent", back_populates="planting", order_by="PlantingEvent.event_date")
    photos = relationship("Photo", back_populates="planting", order_by="Photo.taken_date")


class PlantingEvent(Base):
    __tablename__ = "planting_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    planting_id = Column(Integer, ForeignKey("plantings.id"), nullable=False)
    event_date = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    # Types: fertilize, disease, pest, prune, water, harvest, observation, weather
    details = Column(Text)
    severity = Column(String)  # for disease/pest: low, medium, high
    product_used = Column(String)  # for fertilizer/treatment
    created_at = Column(DateTime, default=datetime.utcnow)

    planting = relationship("Planting", back_populates="events")


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    planting_id = Column(Integer, ForeignKey("plantings.id"), nullable=False)
    filename = Column(String, nullable=False)
    original_name = Column(String)
    caption = Column(Text)
    taken_date = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    planting = relationship("Planting", back_populates="photos")
