from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.services.scheduling import get_schedule

router = APIRouter(prefix="/gardens/{garden_id}/schedule", tags=["schedule"])


@router.get("")
async def garden_schedule(
    garden_id: int,
    season_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Returns all planting events with projected dates, adjusted for season delay_weeks."""
    return await get_schedule(db, garden_id, season_id, date_from, date_to)
