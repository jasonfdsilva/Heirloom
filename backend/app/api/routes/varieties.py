from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.variety import PlantVariety
from app.schemas.variety import SeedPacketExtraction, VarietyCreate, VarietyRead, VarietyUpdate
from app.services.seed_extraction import extract_from_packet

router = APIRouter(prefix="/varieties", tags=["varieties"])


@router.post("", response_model=VarietyRead, status_code=status.HTTP_201_CREATED)
async def create_variety(
    body: VarietyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    variety = PlantVariety(created_by_user_id=current_user.id, **body.model_dump())
    db.add(variety)
    await db.commit()
    await db.refresh(variety)
    return variety


@router.get("", response_model=list[VarietyRead])
async def list_varieties(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(PlantVariety).order_by(PlantVariety.common_name))
    return result.scalars().all()


@router.get("/{variety_id}", response_model=VarietyRead)
async def get_variety(variety_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    variety = await db.get(PlantVariety, variety_id)
    if not variety:
        raise HTTPException(status_code=404, detail="Variety not found")
    return variety


@router.patch("/{variety_id}", response_model=VarietyRead)
async def update_variety(
    variety_id: int,
    body: VarietyUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    variety = await db.get(PlantVariety, variety_id)
    if not variety:
        raise HTTPException(status_code=404, detail="Variety not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(variety, field, value)
    await db.commit()
    await db.refresh(variety)
    return variety


@router.post("/extract-packet", response_model=SeedPacketExtraction)
async def extract_seed_packet(
    file: UploadFile = File(...),
    _=Depends(get_current_user),
):
    """Upload a seed packet photo or PDF and extract variety metadata via Claude vision."""
    content = await file.read()
    result = await extract_from_packet(content, file.content_type or "image/jpeg")
    return result
