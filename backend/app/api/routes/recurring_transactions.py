from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.api.dependencies.auth import get_current_user
from app.models.user import User as UserModel

from app.core.database import get_db

from app.models.recurring_transaction import (
    RecurringTransaction as RecurringTransactionModel,
)
from app.schemas import (
    RecurringTransaction,
    RecurringTransactionCreate,
    RecurringTransactionUpdate,
)

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
    query = db.query(RecurringTransactionModel).filter(
        RecurringTransactionModel.user_id == current_user.id,
        RecurringTransactionModel.deleted_at == None,
    )

    # 활성화 상태 필터
    if is_active is not None:
        query = query.filter(RecurringTransactionModel.is_active == is_active)

    # 정렬
    query = query.order_by(RecurringTransactionModel.created_at.desc())

    recurring_transactions = query.offset(skip).limit(limit).all()

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
    recurring_transaction = (
        db.query(RecurringTransactionModel)
        .filter(RecurringTransactionModel.user_id == current_user.id)
        .filter(RecurringTransactionModel.id == recurring_transaction_id)
        .filter(RecurringTransactionModel.deleted_at == None)
        .first()
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
    try:
        new_recurring_transaction = RecurringTransactionModel(
            **recurring_transaction.model_dump(),
            user_id=current_user.id,
        )
        db.add(new_recurring_transaction)
        db.commit()
        db.refresh(new_recurring_transaction)
        return new_recurring_transaction
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


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
    recurring_transaction = (
        db.query(RecurringTransactionModel)
        .filter(RecurringTransactionModel.user_id == current_user.id)
        .filter(RecurringTransactionModel.id == recurring_transaction_id)
        .first()
    )
    if not recurring_transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring transaction not found",
        )
    for field, value in recurring_update.model_dump(exclude_unset=True).items():
        setattr(recurring_transaction, field, value)
    db.commit()
    db.refresh(recurring_transaction)
    return recurring_transaction


# 5. 반복거래 삭제
@router.delete("/{recurring_transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
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
    # 1. RecurringTransaction 존재 확인
    recurring_transaction = (
        db.query(RecurringTransactionModel)
        .filter(RecurringTransactionModel.user_id == current_user.id)
        .filter(RecurringTransactionModel.id == recurring_transaction_id)
        .first()
    )
    if not recurring_transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring transaction not found",
        )

    # 2. 연결된 scheduled Transaction 삭제 (confirmed는 유지)
    from app.models.transaction import Transaction as TransactionModel
    from app.models.enums import TransactionStatus

    db.query(TransactionModel).filter(
        TransactionModel.user_id == current_user.id,
        TransactionModel.recurring_id == recurring_transaction_id,
        TransactionModel.status == TransactionStatus.SCHEDULED,
    ).delete(synchronize_session=False)

    # 3. RecurringTransaction 삭제
    from sqlalchemy import func
    recurring_transaction.deleted_at = func.now()
    recurring_transaction.is_active = False

    # 4. 변경 사항 저장
    db.commit()
    return
