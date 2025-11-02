from pydantic import BaseModel
from typing import List
from datetime import datetime
from uuid import UUID
from .category import Category
from .transaction import Transaction
from .recurring_transaction import RecurringTransaction


class BackupData(BaseModel):
    """백업 데이터 전체 구조"""

    version: str  # 백업 포맷 버전 (예 "1.0")
    created_at: datetime  # 백업 생성 시각
    user_id: UUID
    categories: List[Category]
    transactions: List[Transaction]
    recurring_transactions: List[RecurringTransaction]


class BackupMetadata(BaseModel):
    """백업 파일 메타데이터 (복원 전 미리보기용)"""

    version: str
    created_at: datetime
    user_id: UUID
    categories_count: int
    transactions_count: int
    recurring_transactions_count: int
