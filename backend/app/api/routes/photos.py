from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.photo import PlantPhoto
from app.models.user import User
from app.services.storage import delete_file, upload_file, generate_thumbnail

router = APIRouter(prefix="/plantings/{planting_id}/photos", tags=["photos"])


class PhotoRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    planting_event_id: int
    storage_url: str
    thumbnail_url: str | None
    caption: str | None


@router.post("", response_model=PhotoRead, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    planting_id: int,
    file: UploadFile = File(...),
    caption: str | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    storage_url = await upload_file(content, file.filename or "photo.jpg", f"photos/{planting_id}")
    thumbnail_url = await generate_thumbnail(content, f"thumbs/{planting_id}")

    photo = PlantPhoto(
        planting_event_id=planting_id,
        uploaded_by_user_id=current_user.id,
        storage_url=storage_url,
        thumbnail_url=thumbnail_url,
        caption=caption,
    )
    db.add(photo)
    await db.commit()
    await db.refresh(photo)
    return photo


@router.get("", response_model=list[PhotoRead])
async def list_photos(
    planting_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(PlantPhoto)
        .where(PlantPhoto.planting_event_id == planting_id)
        .order_by(PlantPhoto.uploaded_at.desc())
    )
    return result.scalars().all()


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(
    photo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    photo = await db.get(PlantPhoto, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    if photo.uploaded_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot delete another user's photo")
    await delete_file(photo.storage_url)
    if photo.thumbnail_url:
        await delete_file(photo.thumbnail_url)
    await db.delete(photo)
    await db.commit()
