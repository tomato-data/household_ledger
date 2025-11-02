from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from uuid import UUID
from typing import List, Optional
from datetime import date

from app.models.transaction import Transaction as TransactionModel
from app.models.enums import TransactionType, TransactionStatus
from app.schemas import TransactionCreate, TransactionUpdate


def get_transactions_by_user(
    db: Session,
    user_id: UUID,
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category_id: Optional[UUID] = None,
    type: Optional[TransactionType] = None,
) -> List[TransactionModel]:
    """
    트랜잭션 목록 조회 (필터링 지원)

    N+1 방지:
    - joinedload로 category eager loading
    """
    query = db.query(TransactionModel).options(joinedload(TransactionModel.category))
    query = query.filter(TransactionModel.user_id == user_id)
    if start_date:
        query = query.filter(TransactionModel.date >= start_date)
    if end_date:
        query = query.filter(TransactionModel.date <= end_date)
    if category_id:
        query = query.filter(TransactionModel.category_id == category_id)
    if type:
        query = query.filter(TransactionModel.type == type)

    return query.order_by(TransactionModel.date.desc()).offset(skip).limit(limit).all()


def get_transaction_by_id(
    db: Session,
    transaction_id: UUID,
    user_id: UUID,
) -> Optional[TransactionModel]:
    """특정 트랜잭션 조회"""
    return (
        db.query(TransactionModel)
        .options(joinedload(TransactionModel.category))
        .filter(TransactionModel.user_id == user_id)
        .filter(TransactionModel.id == transaction_id)
        .first()
    )


def create_transaction(
    db: Session, transaction: TransactionCreate, user_id: UUID
) -> TransactionModel:
    """트랜잭션 생성"""
    new_transaction = TransactionModel(
        **transaction.model_dump(),
        user_id=user_id,
    )
    db.add(new_transaction)
    db.flush()  # ID 생성 (commit 전)
    return new_transaction


def update_transaction(
    db: Session,
    transaction: TransactionModel,
    transaction_update: TransactionUpdate,
) -> TransactionModel:
    """트랜잭션 수정"""
    for field, value in transaction_update.model_dump(exclude_unset=True).items():
        setattr(transaction, field, value)
    db.flush()
    return transaction


def delete_transaction(db: Session, transaction: TransactionModel) -> None:
    """트랜잭션 삭제"""
    db.delete(transaction)
    db.flush()


def get_total_income(db: Session, user_id: UUID) -> float:
    """전체 수입 합계 (confirmed만)"""
    result = (
        db.query(func.sum(TransactionModel.amount))
        .filter(TransactionModel.user_id == user_id)
        .filter(TransactionModel.type == TransactionType.INCOME)
        .filter(TransactionModel.status == TransactionStatus.CONFIRMED)
        .scalar()
    )
    return result or 0


def get_total_expense(db: Session, user_id: UUID) -> float:
    """전체 지출 합계 (confirmed만)"""
    result = (
        db.query(func.sum(TransactionModel.amount))
        .filter(TransactionModel.user_id == user_id)
        .filter(TransactionModel.type == TransactionType.EXPENSE)
        .filter(TransactionModel.status == TransactionStatus.CONFIRMED)
        .scalar()
    )
    return result or 0


def get_transaction_count(db: Session, user_id: UUID) -> int:
    """트랜잭션 수 (confirmed만)"""
    result = (
        db.query(func.count(TransactionModel.id))
        .filter(TransactionModel.user_id == user_id)
        .filter(TransactionModel.status == TransactionStatus.CONFIRMED)
        .scalar()
    )
    return result or 0


def get_category_breakdown(
    db: Session,
    user_id: UUID,
    start_date: date,
    end_date: date,
    type: TransactionType,
):
    """
    카테고리별 집계 (PostgreSQL GROUP BY)

    반환: [(category_id, category_name, category_emoji, total_amount, count), ...]
    """
    from app.models.category import Category as CategoryModel

    return (
        db.query(
            CategoryModel.id.label("category_id"),
            CategoryModel.name.label("category_name"),
            CategoryModel.emoji.label("category_emoji"),
            func.sum(TransactionModel.amount).label("total_amount"),
            func.count(TransactionModel.id).label("transaction_count"),
        )
        .join(CategoryModel, TransactionModel.category_id == CategoryModel.id)
        .filter(TransactionModel.user_id == user_id)
        .filter(TransactionModel.type == type)
        .filter(TransactionModel.status == TransactionStatus.CONFIRMED)
        .filter(TransactionModel.date >= start_date)
        .filter(TransactionModel.date <= end_date)
        .group_by(CategoryModel.id, CategoryModel.name, CategoryModel.emoji)
        .order_by(func.sum(TransactionModel.amount).desc())
        .all()
    )
