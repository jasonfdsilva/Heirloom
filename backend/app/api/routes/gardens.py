from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_owner
from app.core.config import settings
from app.db.session import get_db
from app.models.garden import Garden, GardenMembership, MemberRole
from app.models.user import User
from app.schemas.garden import GardenCreate, GardenRead, GardenUpdate, InviteCreate, MembershipRead

router = APIRouter(prefix="/gardens", tags=["gardens"])


@router.post("", response_model=GardenRead, status_code=status.HTTP_201_CREATED)
async def create_garden(
    body: GardenCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    garden = Garden(
        name=body.name,
        location_description=body.location_description,
        last_frost_date=body.last_frost_date or settings.DEFAULT_LAST_FROST_DATE,
        first_frost_date=body.first_frost_date or settings.DEFAULT_FIRST_FROST_DATE,
    )
    db.add(garden)
    await db.flush()
    membership = GardenMembership(user_id=current_user.id, garden_id=garden.id, role=MemberRole.owner)
    db.add(membership)
    await db.commit()
    await db.refresh(garden)
    return garden


@router.get("", response_model=list[GardenRead])
async def list_gardens(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Garden)
        .join(GardenMembership, GardenMembership.garden_id == Garden.id)
        .where(GardenMembership.user_id == current_user.id)
    )
    return result.scalars().all()


@router.get("/{garden_id}", response_model=GardenRead)
async def get_garden(garden_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    garden = await db.get(Garden, garden_id)
    if not garden:
        raise HTTPException(status_code=404, detail="Garden not found")
    return garden


@router.patch("/{garden_id}", response_model=GardenRead)
async def update_garden(
    garden_id: int,
    body: GardenUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_owner),
):
    garden = await db.get(Garden, garden_id)
    if not garden:
        raise HTTPException(status_code=404, detail="Garden not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(garden, field, value)
    await db.commit()
    await db.refresh(garden)
    return garden


@router.post("/{garden_id}/invite", response_model=MembershipRead, status_code=status.HTTP_201_CREATED)
async def invite_member(
    garden_id: int,
    body: InviteCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_owner),
):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found — they must register first")
    existing = await db.execute(
        select(GardenMembership).where(
            GardenMembership.garden_id == garden_id,
            GardenMembership.user_id == user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="User already has access")
    membership = GardenMembership(user_id=user.id, garden_id=garden_id, role=body.role)
    db.add(membership)
    await db.commit()
    await db.refresh(membership)
    return membership
