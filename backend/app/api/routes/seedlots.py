from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.seedlot import SeedLot
from app.models.user import User
from app.schemas.seedlot import SeedLotCreate, SeedLotRead, SeedLotUpdate
from app.services.storage import upload_file

router = APIRouter(tags=["seedlots"])


@router.post("/seedlots", response_model=SeedLotRead, status_code=status.HTTP_201_CREATED)
async def create_seedlot(
    body: SeedLotCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lot = SeedLot(**body.model_dump())
    db.add(lot)
    await db.commit()
    await db.refresh(lot)
    return lot


@router.get("/varieties/{variety_id}/seedlots", response_model=list[SeedLotRead])
async def list_seedlots(
    variety_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(SeedLot).where(SeedLot.variety_id == variety_id).order_by(SeedLot.created_at.desc())
    )
    return result.scalars().all()


@router.patch("/seedlots/{lot_id}", response_model=SeedLotRead)
async def update_seedlot(
    lot_id: int,
    body: SeedLotUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    lot = await db.get(SeedLot, lot_id)
    if not lot:
        raise HTTPException(status_code=404, detail="Seed lot not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(lot, field, value)
    await db.commit()
    await db.refresh(lot)
    return lot


@router.post("/seedlots/{lot_id}/packet", response_model=SeedLotRead)
async def upload_packet_image(
    lot_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    lot = await db.get(SeedLot, lot_id)
    if not lot:
        raise HTTPException(status_code=404, detail="Seed lot not found")
    content = await file.read()
    url = await upload_file(content, file.filename or "packet", f"packets/{lot_id}")
    lot.packet_image_url = url
    await db.commit()
    await db.refresh(lot)
    return lot
