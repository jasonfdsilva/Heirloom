from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_editor
from app.db.session import get_db
from app.models.expense import ExpenseCategory, GardenExpense
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseRead, ExpenseUpdate
from app.services.storage import upload_file

router = APIRouter(prefix="/gardens/{garden_id}/expenses", tags=["expenses"])


@router.post("", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED)
async def create_expense(
    garden_id: int,
    body: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_editor),
):
    expense = GardenExpense(
        garden_id=garden_id,
        logged_by_user_id=current_user.id,
        **body.model_dump(),
    )
    db.add(expense)
    await db.commit()
    await db.refresh(expense)
    return expense


@router.post("/{expense_id}/receipt", response_model=ExpenseRead)
async def upload_receipt(
    garden_id: int,
    expense_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    expense = await db.get(GardenExpense, expense_id)
    if not expense or expense.garden_id != garden_id:
        raise HTTPException(status_code=404, detail="Expense not found")
    content = await file.read()
    receipt_url = await upload_file(content, file.filename or "receipt", f"receipts/{garden_id}")
    expense.receipt_url = receipt_url
    await db.commit()
    await db.refresh(expense)
    return expense


@router.get("", response_model=list[ExpenseRead])
async def list_expenses(
    garden_id: int,
    season_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    query = select(GardenExpense).where(GardenExpense.garden_id == garden_id)
    if season_id:
        query = query.where(GardenExpense.season_id == season_id)
    result = await db.execute(query.order_by(GardenExpense.purchased_at.desc()))
    return result.scalars().all()


@router.patch("/{expense_id}", response_model=ExpenseRead)
async def update_expense(
    garden_id: int,
    expense_id: int,
    body: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_editor),
):
    expense = await db.get(GardenExpense, expense_id)
    if not expense or expense.garden_id != garden_id:
        raise HTTPException(status_code=404, detail="Expense not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(expense, field, value)
    await db.commit()
    await db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    garden_id: int,
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_editor),
):
    expense = await db.get(GardenExpense, expense_id)
    if not expense or expense.garden_id != garden_id:
        raise HTTPException(status_code=404, detail="Expense not found")
    await db.delete(expense)
    await db.commit()
