from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.api.dependencies.auth import get_current_user
from app.models.user import User as UserModel

from app.core.database import get_db

from app.schemas import (
    RecurringTransaction,
    RecurringTransactionCreate,
    RecurringTransactionUpdate,
)
from app.services.recurring_transaction_service import RecurringTransactionService


router = APIRouter(
    prefix="/recurring-transactions",
    tags=["recurring_transactions"],
)


# 1. 반복거래 목록 조회
@router.get("/", response_model=List[RecurringTransaction])
def get_recurring_transactions(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    반복거래 목록 조회
    - skip: 건너뛸 개수 (페이지네이션)
    - limit: 조회할 개수 (페이지네이션)
    - is_active: 활성 여부 필터
    """
    service = RecurringTransactionService(db)
    recurring_transactions = service.get_recurring_transactions(
        current_user.id, skip, limit, is_active
    )
    return recurring_transactions


# 2. 단일 반복거래 조회
@router.get("/{recurring_transaction_id}", response_model=RecurringTransaction)
def get_recurring_transaction(
    recurring_transaction_id: UUID,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    특정 ID의 반복거래 조회(본인 것만)
    """
    service = RecurringTransactionService(db)
    recurring_transaction = service.get_recurring_transaction(
        current_user.id, recurring_transaction_id
    )
    if not recurring_transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring transaction not found",
        )
    return recurring_transaction


# 3. 반복거래 생성
@router.post(
    "/", response_model=RecurringTransaction, status_code=status.HTTP_201_CREATED
)
def create_recurring_transaction(
    recurring_transaction: RecurringTransactionCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    새 반복거래 생성
    """
    service = RecurringTransactionService(db)
    new_recurring_transaction = service.create_recurring_transaction(
        recurring_transaction, current_user.id
    )
    return new_recurring_transaction


# 4. 반복거래 수정
@router.patch("/{recurring_transaction_id}", response_model=RecurringTransaction)
def update_recurring_transaction(
    recurring_transaction_id: UUID,
    recurring_update: RecurringTransactionUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    반복거래 수정
    """
    service = RecurringTransactionService(db)
    updated_recurring_transaction = service.update_recurring_transaction(
        recurring_transaction_id, recurring_update, current_user.id
    )
    if not updated_recurring_transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring transaction not found",
        )
    return updated_recurring_transaction


# 5. 반복거래 삭제
@router.delete("/{recurring_transaction_id}", status_code=status.HTTP_200_OK)
def delete_recurring_transaction(
    recurring_transaction_id: UUID,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    반복거래 삭제
    - RecurringTransaction을 삭제합니다
    - 연결된 scheduled 상태의 Transaction만 함께 삭제합니다
    - confirmed 상태의 Transaction은 유지됩니다 (실제 발생한 거래 보호)
    """
    service = RecurringTransactionService(db)
    deleted_count = service.delete_recurring_transaction(
        recurring_transaction_id, current_user.id
    )
    if deleted_count is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring transaction not found",
        )
    return {
        "message": "Recurring transaction deleted successfully",
        "deleted_scheduled_count": deleted_count,
    }
