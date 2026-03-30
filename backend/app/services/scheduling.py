"""Planting schedule service.
Returns all planting events with projected dates adjusted for season delay_weeks.
Flags any crop at risk of not completing before first frost.
"""
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.garden import Garden
from app.models.planting import PlantingEvent
from app.models.season import GardenSeason
from app.models.space import GrowingSpace
from app.models.variety import PlantVariety


def _apply_delay(d: date | None, delay_weeks: int) -> date | None:
    if d is None:
        return None
    return d + timedelta(weeks=delay_weeks)


def _parse_frost_date(mm_dd: str, year: int) -> date:
    month, day = mm_dd.split("-")
    return date(year, int(month), int(day))


async def get_schedule(
    db: AsyncSession,
    garden_id: int,
    season_id: int | None,
    date_from: date | None,
    date_to: date | None,
) -> list[dict]:
    garden = await db.get(Garden, garden_id)
    if not garden:
        return []

    season_query = select(GardenSeason).where(GardenSeason.garden_id == garden_id)
    if season_id:
        season_query = season_query.where(GardenSeason.id == season_id)
    seasons_result = await db.execute(season_query)
    seasons = {s.id: s for s in seasons_result.scalars().all()}

    if not seasons:
        return []

    planting_query = (
        select(PlantingEvent)
        .where(PlantingEvent.season_id.in_(seasons.keys()))
    )
    plantings_result = await db.execute(planting_query)
    plantings = plantings_result.scalars().all()

    rows = []
    for p in plantings:
        season = seasons[p.season_id]
        delay = season.delay_weeks

        projected_sow = _apply_delay(p.planned_sow_date, delay)
        projected_transplant = _apply_delay(p.planned_transplant_date, delay)
        projected_harvest = _apply_delay(p.planned_harvest_start, delay)

        # Frost risk: flag if projected harvest start + days_to_maturity > first frost
        first_frost = _parse_frost_date(garden.first_frost_date, season.year)
        frost_risk = False
        if projected_harvest and projected_harvest > first_frost:
            frost_risk = True

        row = {
            "planting_id": p.id,
            "season_id": p.season_id,
            "season_name": season.name,
            "variety_id": p.variety_id,
            "space_id": p.space_id,
            "location_note": p.location_note,
            "sow_type": p.sow_type,
            "status": p.status,
            "delay_weeks": delay,
            "delay_reason": season.delay_reason,
            # Planned (original)
            "planned_sow_date": p.planned_sow_date,
            "planned_transplant_date": p.planned_transplant_date,
            "planned_harvest_start": p.planned_harvest_start,
            # Projected (delay-adjusted)
            "projected_sow_date": projected_sow,
            "projected_transplant_date": projected_transplant,
            "projected_harvest_start": projected_harvest,
            # Actual
            "actual_sow_date": p.actual_sow_date,
            "actual_transplant_date": p.actual_transplant_date,
            # Flags
            "frost_risk": frost_risk,
        }

        # Filter by date range if provided
        anchor = p.actual_sow_date or projected_sow or projected_harvest
        if date_from and anchor and anchor < date_from:
            continue
        if date_to and anchor and anchor > date_to:
            continue

        rows.append(row)

    rows.sort(key=lambda r: r["projected_sow_date"] or date.max)
    return rows
