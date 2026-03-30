from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_editor
from app.db.session import get_db
from app.models.season import GardenSeason
from app.schemas.season import SeasonCreate, SeasonRead, SeasonUpdate

router = APIRouter(prefix="/gardens/{garden_id}/seasons", tags=["seasons"])


@router.post("", response_model=SeasonRead, status_code=status.HTTP_201_CREATED)
async def create_season(
    garden_id: int,
    body: SeasonCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_editor),
):
    season = GardenSeason(garden_id=garden_id, **body.model_dump())
    db.add(season)
    await db.commit()
    await db.refresh(season)
    return season


@router.get("", response_model=list[SeasonRead])
async def list_seasons(
    garden_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(GardenSeason)
        .where(GardenSeason.garden_id == garden_id)
        .order_by(GardenSeason.year.desc())
    )
    return result.scalars().all()


@router.get("/{season_id}", response_model=SeasonRead)
async def get_season(
    season_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    season = await db.get(GardenSeason, season_id)
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    return season


@router.patch("/{season_id}", response_model=SeasonRead)
async def update_season(
    season_id: int,
    body: SeasonUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_editor),
):
    season = await db.get(GardenSeason, season_id)
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(season, field, value)
    await db.commit()
    await db.refresh(season)
    return season
