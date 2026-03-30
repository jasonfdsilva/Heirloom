from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_editor
from app.db.session import get_db
from app.models.space import GrowingSpace
from app.schemas.space import SpaceCreate, SpaceRead, SpaceUpdate

router = APIRouter(prefix="/gardens/{garden_id}/spaces", tags=["spaces"])


@router.post("", response_model=SpaceRead, status_code=status.HTTP_201_CREATED)
async def create_space(
    garden_id: int,
    body: SpaceCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_editor),
):
    space = GrowingSpace(garden_id=garden_id, **body.model_dump())
    db.add(space)
    await db.commit()
    await db.refresh(space)
    return space


@router.get("", response_model=list[SpaceRead])
async def list_spaces(
    garden_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(GrowingSpace)
        .where(GrowingSpace.garden_id == garden_id)
        .order_by(GrowingSpace.display_order)
    )
    return result.scalars().all()


@router.get("/{space_id}", response_model=SpaceRead)
async def get_space(space_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    space = await db.get(GrowingSpace, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    return space


@router.patch("/{space_id}", response_model=SpaceRead)
async def update_space(
    space_id: int,
    body: SpaceUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_editor),
):
    space = await db.get(GrowingSpace, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(space, field, value)
    await db.commit()
    await db.refresh(space)
    return space


@router.delete("/{space_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_space(space_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_editor)):
    space = await db.get(GrowingSpace, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    await db.delete(space)
    await db.commit()
