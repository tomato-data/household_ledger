from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
from uuid import UUID


from app.models.enums import TransactionType, RecurringFrequency


# 공통 필드
class RecurringTransactionBase(BaseModel):
    template_name: str = Field(
        ...,
        min_length=1,
        max_length=255,
    )
    description: str = Field(..., min_length=1, max_length=255)
    amount: int = Field(..., gt=0)
    type: TransactionType = Field(..., description="거래 유형 (income/expense)")
    frequency: RecurringFrequency = Field(..., description="반복 주기")
    start_date: str = Field(..., description="시작월")
    end_date: Optional[str] = Field(None, description="종료월 (빈 값이면 무제한)")
    day_of_month: int = Field(..., ge=1, le=31, description="실행 날짜(1~31)")
    is_active: bool = Field(True, description="활성 여부")
    is_variable_amount: bool = Field(False, description="금액 변동 가능 여부")

    @validator("end_date")
    def end_date_must_be_after_start(cls, v, values):
        """종료 날짜가 시작 날짜보다 이후인지 검증"""
        if v and "start_date" in values and v < values["start_date"]:
            raise ValueError("종료 날짜는 시작 날짜보다 이후여야 합니다.")
        return v


# 생성 요청용
class RecurringTransactionCreate(RecurringTransactionBase):
    pass


# 수정 요청용
class RecurringTransactionUpdate(BaseModel):
    template_name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    amount: Optional[int] = Field(None, gt=0)
    type: Optional[TransactionType] = None
    frequency: Optional[RecurringFrequency] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    day_of_month: Optional[int] = Field(None, ge=1, le=31)
    is_active: Optional[bool] = None
    is_variable_amount: Optional[bool] = None


# API 응답용
class RecurringTransaction(RecurringTransactionBase):
    id: UUID = Field(..., description="반복 거래 ID")
    user_id: UUID = Field(..., description="사용자 ID")
    created_at: datetime = Field(..., description="생성일")
    updated_at: datetime = Field(..., description="수정일")

    class Config:
        from_attributes = True  # Pydantic v2
