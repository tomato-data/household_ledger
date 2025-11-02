from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional

from app.models.recurring_transaction import (
    RecurringTransaction as RecurringTransactionModel,
)
from app.schemas.recurring_transaction import (
    RecurringTransactionCreate,
    RecurringTransactionUpdate,
)


def get_recurring_transactions_by_user(
    db: Session,
    user_id: UUID,
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
):
    query = db.query(RecurringTransactionModel).filter(
        RecurringTransactionModel.user_id == user_id,
        RecurringTransactionModel.deleted_at == None,
    )

    # 활성화 상태 필터
    if is_active is not None:
        query = query.filter(RecurringTransactionModel.is_active == is_active)

    # 정렬
    query = query.order_by(RecurringTransactionModel.created_at.desc())

    recurring_transactions = query.offset(skip).limit(limit).all()

    return recurring_transactions


def get_recurring_transaction_by_id(
    db: Session, recurring_transaction_id: UUID, user_id: UUID
) -> Optional[RecurringTransactionModel]:
    """특정 ID의 반복거래 조회"""
    return (
        db.query(RecurringTransactionModel)
        .filter(RecurringTransactionModel.user_id == user_id)
        .filter(RecurringTransactionModel.id == recurring_transaction_id)
        .filter(RecurringTransactionModel.deleted_at == None)
        .first()
    )


def create_recurring_transaction(
    db: Session, recurring_transaction: RecurringTransactionCreate, user_id: UUID
) -> RecurringTransactionModel:
    """새 반복거래 생성"""
    new_recurring_transaction = RecurringTransactionModel(
        **recurring_transaction.model_dump(),
        user_id=user_id,
    )
    db.add(new_recurring_transaction)
    db.flush()
    return new_recurring_transaction


def update_recurring_transaction(
    db: Session,
    recurring_transaction: RecurringTransactionModel,
    recurring_update: RecurringTransactionUpdate,
) -> RecurringTransactionModel:
    """반복거래 수정"""
    for field, value in recurring_update.model_dump(exclude_unset=True).items():
        setattr(recurring_transaction, field, value)
    db.flush()
    return recurring_transaction


def soft_delete_recurring_transaction(
    db: Session, recurring_transaction: RecurringTransactionModel
) -> None:
    """
    반복거래 소프트 삭제 (단일 테이블만)

    연결된 Transaction 삭제는 Service에서 처리
    """
    from sqlalchemy import func

    recurring_transaction.deleted_at = func.now()
    recurring_transaction.is_active = False
    db.flush()


def delete_scheduled_transactions_by_recurring_id(
    db: Session, recurring_id: UUID, user_id: UUID
) -> int:
    """
    특정 반복거래의 scheduled 상태 트랜잭션 삭제

    반환: 삭제된 개수
    """
    from app.models.transaction import Transaction as TransactionModel
    from app.models.enums import TransactionStatus

    deleted_count = (
        db.query(TransactionModel)
        .filter(
            TransactionModel.user_id == user_id,
            TransactionModel.recurring_id == recurring_id,
            TransactionModel.status == TransactionStatus.SCHEDULED,
        )
        .delete(synchronize_session=False)
    )

    db.flush()
    return deleted_count
