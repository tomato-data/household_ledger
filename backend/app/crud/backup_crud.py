from sqlalchemy.orm import Session, joinedload
from uuid import UUID
from typing import List

from app.models.category import Category as CategoryModel
from app.models.transaction import Transaction as TransactionModel
from app.models.recurring_transaction import (
    RecurringTransaction as RecurringTransactionModel,
)


def get_all_user_data(db: Session, user_id: UUID):
    """사용자의 모든 데이터 조회"""
    categories = (
        db.query(CategoryModel)
        .filter(CategoryModel.user_id == user_id)
        .order_by(CategoryModel.order)
        .all()
    )

    transactions = (
        db.query(TransactionModel)
        .options(joinedload(TransactionModel.category))
        .filter(TransactionModel.user_id == user_id)
        .all()
    )

    recurring_transactions = (
        db.query(RecurringTransactionModel)
        .filter(RecurringTransactionModel.user_id == user_id)
        .filter(RecurringTransactionModel.deleted_at.is_(None))
        .all()
    )
    return {
        "categories": categories,
        "transactions": transactions,
        "recurring_transactions": recurring_transactions,
    }


def delete_all_user_data(db: Session, user_id: UUID):
    """사용자 데이터 전체 삭제 (복원 시 덮어쓰기용)"""
    db.query(TransactionModel).filter(TransactionModel.user_id == user_id).delete()
    db.query(RecurringTransactionModel).filter(
        RecurringTransactionModel.user_id == user_id
    ).delete()
    db.query(CategoryModel).filter(CategoryModel.user_id == user_id).delete()
    db.flush()


def bulk_insert_categories(db: Session, categories: List[CategoryModel]):
    """카테고리 대량 삽입"""
    db.bulk_save_objects(categories)
    db.flush()


def bulk_insert_transactions(db: Session, transactions: List[TransactionModel]):
    """트랜잭션 대량 삽입"""
    db.bulk_save_objects(transactions)
    db.flush()


def bulk_insert_recurring_transactions(
    db: Session, recurring_transactions: List[RecurringTransactionModel]
):
    """반복 트랜잭션 대량 삽입"""
    db.bulk_save_objects(recurring_transactions)
    db.flush()
