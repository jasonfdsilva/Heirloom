"""Maintenance logs, issue logs, harvest records — all keyed to a planting event."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_editor
from app.db.session import get_db
from app.models.harvest import HarvestRecord
from app.models.issue import IssueLog
from app.models.maintenance import MaintenanceLog
from app.models.user import User
from app.schemas.harvest import HarvestRecordCreate, HarvestRecordRead
from app.schemas.issue import IssueLogCreate, IssueLogRead, IssueLogUpdate
from app.schemas.maintenance import MaintenanceLogCreate, MaintenanceLogRead

router = APIRouter(prefix="/plantings/{planting_id}", tags=["logs"])


# --- Maintenance ---

@router.post("/maintenance", response_model=MaintenanceLogRead, status_code=status.HTTP_201_CREATED)
async def add_maintenance(
    planting_id: int,
    body: MaintenanceLogCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    log = MaintenanceLog(
        planting_event_id=planting_id,
        logged_by_user_id=current_user.id,
        **body.model_dump(exclude={"planting_event_id"}),
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log


@router.get("/maintenance", response_model=list[MaintenanceLogRead])
async def list_maintenance(
    planting_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(MaintenanceLog)
        .where(MaintenanceLog.planting_event_id == planting_id)
        .order_by(MaintenanceLog.occurred_at.desc())
    )
    return result.scalars().all()


# --- Issues ---

@router.post("/issues", response_model=IssueLogRead, status_code=status.HTTP_201_CREATED)
async def add_issue(
    planting_id: int,
    body: IssueLogCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    issue = IssueLog(
        planting_event_id=planting_id,
        logged_by_user_id=current_user.id,
        **body.model_dump(exclude={"planting_event_id"}),
    )
    db.add(issue)
    await db.commit()
    await db.refresh(issue)
    return issue


@router.get("/issues", response_model=list[IssueLogRead])
async def list_issues(
    planting_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(IssueLog)
        .where(IssueLog.planting_event_id == planting_id)
        .order_by(IssueLog.occurred_at.desc())
    )
    return result.scalars().all()


@router.patch("/issues/{issue_id}", response_model=IssueLogRead)
async def update_issue(
    issue_id: int,
    body: IssueLogUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    issue = await db.get(IssueLog, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(issue, field, value)
    await db.commit()
    await db.refresh(issue)
    return issue


# --- Harvests ---

@router.post("/harvests", response_model=HarvestRecordRead, status_code=status.HTTP_201_CREATED)
async def add_harvest(
    planting_id: int,
    body: HarvestRecordCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    record = HarvestRecord(
        planting_event_id=planting_id,
        logged_by_user_id=current_user.id,
        **body.model_dump(exclude={"planting_event_id"}),
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


@router.get("/harvests", response_model=list[HarvestRecordRead])
async def list_harvests(
    planting_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(HarvestRecord)
        .where(HarvestRecord.planting_event_id == planting_id)
        .order_by(HarvestRecord.harvested_at.desc())
    )
    return result.scalars().all()
