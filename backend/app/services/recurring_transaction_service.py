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
from app.crud.recurring_transaction_crud import (
    get_recurring_transactions_by_user,
    get_recurring_transaction_by_id,
    create_recurring_transaction,
    update_recurring_transaction,
    soft_delete_recurring_transaction,
    delete_scheduled_transactions_by_recurring_id,
)


class RecurringTransactionService:
    def __init__(self, db: Session):
        self.db = db

    def get_recurring_transactions(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
    ) -> List[RecurringTransactionModel]:
        return get_recurring_transactions_by_user(
            self.db, user_id, skip, limit, is_active
        )

    def get_recurring_transaction(
        self, user_id: UUID, recurring_transaction_id: UUID
    ) -> Optional[RecurringTransactionModel]:
        return get_recurring_transaction_by_id(
            self.db, recurring_transaction_id, user_id
        )

    def create_recurring_transaction(
        self, recurring_transaction: RecurringTransactionCreate, user_id: UUID
    ):
        new_recurring_transaction = create_recurring_transaction(
            self.db, recurring_transaction, user_id
        )
        self.db.commit()
        self.db.refresh(new_recurring_transaction)
        return new_recurring_transaction

    def update_recurring_transaction(
        self,
        recurring_transaction_id: UUID,
        recurring_transaction_update: RecurringTransactionUpdate,
        user_id: UUID,
    ):
        recurring_transaction = get_recurring_transaction_by_id(
            self.db, recurring_transaction_id, user_id
        )
        if not recurring_transaction:
            return None
        updated_recurring_transaction = update_recurring_transaction(
            self.db, recurring_transaction, recurring_transaction_update
        )
        self.db.commit()
        self.db.refresh(updated_recurring_transaction)
        return updated_recurring_transaction

    def delete_recurring_transaction(
        self, recurring_transaction_id: UUID, user_id: UUID
    ):
        recurring_transaction = get_recurring_transaction_by_id(
            self.db, recurring_transaction_id, user_id
        )
        if not recurring_transaction:
            return None
        deleted_count = delete_scheduled_transactions_by_recurring_id(
            self.db, recurring_transaction_id, user_id
        )
        soft_delete_recurring_transaction(self.db, recurring_transaction)
        self.db.commit()
        return deleted_count
