from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_editor
from app.db.session import get_db
from app.models.planting import PlantingEvent
from app.schemas.planting import PlantingCreate, PlantingRead, PlantingUpdate

router = APIRouter(prefix="/gardens/{garden_id}/plantings", tags=["plantings"])


@router.post("", response_model=PlantingRead, status_code=status.HTTP_201_CREATED)
async def create_planting(
    garden_id: int,
    body: PlantingCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_editor),
):
    planting = PlantingEvent(**body.model_dump())
    db.add(planting)
    await db.commit()
    await db.refresh(planting)
    return planting


@router.get("", response_model=list[PlantingRead])
async def list_plantings(
    garden_id: int,
    season_id: int | None = None,
    space_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    from app.models.season import GardenSeason
    from app.models.space import GrowingSpace

    query = (
        select(PlantingEvent)
        .join(GardenSeason, GardenSeason.id == PlantingEvent.season_id)
        .join(GrowingSpace, GrowingSpace.id == PlantingEvent.space_id)
        .where(GardenSeason.garden_id == garden_id)
    )
    if season_id:
        query = query.where(PlantingEvent.season_id == season_id)
    if space_id:
        query = query.where(PlantingEvent.space_id == space_id)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{planting_id}", response_model=PlantingRead)
async def get_planting(
    planting_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    planting = await db.get(PlantingEvent, planting_id)
    if not planting:
        raise HTTPException(status_code=404, detail="Planting not found")
    return planting


@router.patch("/{planting_id}", response_model=PlantingRead)
async def update_planting(
    planting_id: int,
    body: PlantingUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_editor),
):
    planting = await db.get(PlantingEvent, planting_id)
    if not planting:
        raise HTTPException(status_code=404, detail="Planting not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(planting, field, value)
    await db.commit()
    await db.refresh(planting)
    return planting


@router.delete("/{planting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_planting(
    planting_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_editor),
):
    planting = await db.get(PlantingEvent, planting_id)
    if not planting:
        raise HTTPException(status_code=404, detail="Planting not found")
    await db.delete(planting)
    await db.commit()
