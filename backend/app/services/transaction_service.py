from sqlalchemy.orm import Session

from datetime import date
from uuid import UUID
from typing import List, Optional
from app.models.transaction import Transaction as TransactionModel
from app.schemas.transaction import (
    TransactionCreate,
    TransactionUpdate,
    TransactionStats,
    TransactionType,
    CategoryExpenseStats,
)
from app.crud.transaction_crud import (
    get_transactions_by_user,
    get_transaction_by_id,
    create_transaction,
    update_transaction,
    delete_transaction,
    get_total_income,
    get_total_expense,
    get_transaction_count,
    get_category_breakdown,
)
from app.crud.category_crud import get_category_by_id


class TransactionService:
    def __init__(self, db: Session):
        self.db = db

    def get_transactions(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        category_id: Optional[UUID] = None,
        type: Optional[TransactionType] = None,
        recurring_id: Optional[UUID] = None,
    ) -> List[TransactionModel]:
        return get_transactions_by_user(
            self.db,
            user_id,
            skip,
            limit,
            start_date,
            end_date,
            category_id,
            type,
            recurring_id,
        )

    def get_transaction(
        self, user_id: UUID, transaction_id: UUID
    ) -> Optional[TransactionModel]:
        return get_transaction_by_id(self.db, transaction_id, user_id)

    def create_transaction(self, transaction: TransactionCreate, user_id: UUID):
        category = get_category_by_id(self.db, transaction.category_id, user_id)
        if not category:
            return None
        new_transaction = create_transaction(self.db, transaction, user_id)
        new_transaction.category = category
        self.db.commit()
        self.db.refresh(new_transaction)
        return new_transaction

    def update_transaction(
        self, transaction_id: UUID, transaction_update: TransactionUpdate, user_id: UUID
    ):
        # 1. 트랜잭션 존재 확인
        transaction = get_transaction_by_id(self.db, transaction_id, user_id)
        if not transaction:
            return None

        # 2. 변경된 필드만 추출
        updated_data = transaction_update.model_dump(exclude_unset=True)

        # 3. category_id 변경 여부 확인
        if "category_id" in updated_data:
            new_category = get_category_by_id(
                self.db, updated_data["category_id"], user_id
            )
            if not new_category:
                return None
            # N+1 방지: 이미 조회한 category 할당
            transaction.category = new_category

        # 4. 트랜잭션 업데이트
        updated_transaction = update_transaction(
            self.db, transaction, transaction_update
        )
        self.db.commit()
        self.db.refresh(updated_transaction)
        return updated_transaction

    def delete_transaction(self, transaction_id: UUID, user_id: UUID):
        transaction = get_transaction_by_id(self.db, transaction_id, user_id)
        if not transaction:
            return False
        delete_transaction(self.db, transaction)
        self.db.commit()
        return True

    def get_stats(self, user_id: UUID) -> TransactionStats:
        total_income = get_total_income(self.db, user_id)
        total_expense = get_total_expense(self.db, user_id)
        transaction_count = get_transaction_count(self.db, user_id)
        return TransactionStats(
            total_income=total_income,
            total_expense=total_expense,
            net_asset=total_income - total_expense,
            transaction_count=transaction_count,
        )

    def get_category_breakdown(
        self, user_id: UUID, start_date: date, end_date: date, type: TransactionType
    ) -> List[CategoryExpenseStats]:
        results = get_category_breakdown(self.db, user_id, start_date, end_date, type)
        total = sum(r.total_amount for r in results)

        return [
            CategoryExpenseStats(
                category_id=r.category_id,
                category_name=r.category_name,
                category_emoji=r.category_emoji,
                total_amount=r.total_amount,
                transaction_count=r.transaction_count,
                percentage=r.total_amount / total if total > 0 else 0,
            )
            for r in results
        ]
