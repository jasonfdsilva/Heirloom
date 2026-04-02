import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from backend.app.database import get_db
from backend.app.schemas.plant import PlantUpdate, HarvestCreate
from backend.app.services import plant_service

router = APIRouter(prefix="/api/plants", tags=["plants"])


@router.get("/{plant_guid}")
def get_plant(plant_guid: str, db: sqlite3.Connection = Depends(get_db)):
    plant = plant_service.get_plant(db, plant_guid)
    if not plant:
        raise HTTPException(404, "Plant not found")
    return plant


@router.patch("/{plant_guid}")
def update_plant(
    plant_guid: str, data: PlantUpdate, db: sqlite3.Connection = Depends(get_db)
):
    return plant_service.update_plant(db, plant_guid, data)


@router.get("/{plant_guid}/harvests")
def list_plant_harvests(plant_guid: str, db: sqlite3.Connection = Depends(get_db)):
    return plant_service.list_plant_harvests(db, plant_guid)


@router.post("/{plant_guid}/harvests")
def create_plant_harvest(
    plant_guid: str, data: HarvestCreate, db: sqlite3.Connection = Depends(get_db)
):
    return plant_service.create_plant_harvest(db, plant_guid, data)


@router.delete("/{plant_guid}/harvests/{harvest_id}")
def delete_plant_harvest(
    plant_guid: str, harvest_id: int, db: sqlite3.Connection = Depends(get_db)
):
    return plant_service.delete_plant_harvest(db, harvest_id)
