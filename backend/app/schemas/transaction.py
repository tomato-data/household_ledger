from pydantic import BaseModel, Field
from typing import Optional
from datetime import date as DateType, datetime
from uuid import UUID

from app.models.enums import TransactionType, TransactionStatus


# 중첩된 Category 정보 (읽기 전용)
class CategoryNested(BaseModel):
    id: UUID
    name: str
    emoji: Optional[str] = None

    class Config:
        from_attributes = True


# 공통 필드
class TransactionBase(BaseModel):
    date: DateType = Field(..., description="거래 날짜 (YYYY-MM-DD)")
    description: str = Field(..., min_length=1, max_length=255, description="거래 설명")
    amount: int = Field(..., gt=0, description="금액 (양수)")
    type: TransactionType = Field(..., description="거래 유형 (income/expense)")
    category_id: UUID = Field(..., description="카테고리 ID")
    status: TransactionStatus = Field(..., description="거래 상태")


# 생성 요청용
class TransactionCreate(TransactionBase):
    recurring_id: Optional[UUID] = Field(None, description="반복 거래 ID (선택)")


# 수정 요청용
class TransactionUpdate(BaseModel):
    date: Optional[DateType] = None
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    amount: Optional[int] = Field(None, gt=0)
    type: Optional[TransactionType] = None
    category_id: Optional[UUID] = None
    status: Optional[TransactionStatus] = None
    # recurring_id는 수정 불가


# DB 저장 형식
class TransactionInDB(TransactionBase):
    id: UUID
    user_id: UUID
    recurring_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime


# API 응답용
class Transaction(TransactionInDB):
    category: CategoryNested

    class Config:
        from_attributes = True  # Pydantic v2
        # orm_mode = True # Pydantic v1


# 통계 응답용
class TransactionStats(BaseModel):
    total_income: int = Field(..., description="수입 합계")
    total_expense: int = Field(..., description="지출 합계")
    net_asset: int = Field(..., description="순자산 (수입 - 지출)")
    transaction_count: int = Field(..., description="총 트랜잭션 수 (Confirmed만)")


class CategoryExpenseStats(BaseModel):
    category_id: UUID
    category_name: str
    category_emoji: Optional[str]
    total_amount: int
    transaction_count: int
    percentage: float # 전체 중 비율 (Backend에서 계산)

    class Config:
        from_attributes = True