from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import AdjustmentType


# 기본 스키마 (공통 필드)
class AssetAdjustmentBase(BaseModel):
    amount: int = Field(..., gt=0, description="조정 금액 (양수)")
    type: AdjustmentType = Field(..., description="조정 유형")
    reason: str = Field(..., min_length=1, max_length=255, description="조정 사유")


# 생성 요청용
class AssetAdjustmentCreate(AssetAdjustmentBase):
    adjustment_date: date = Field(..., description="조정 날짜")


# 수정 요청용 (모든 필드 Optional)
class AssetAdjustmentUpdate(BaseModel):
    amount: Optional[int] = Field(None, gt=0)
    type: Optional[AdjustmentType] = None
    reason: Optional[str] = Field(None, min_length=1, max_length=255)


# API 응답용 (DB에서 가져온 전체 데이터)
class AssetAdjustmentResponse(AssetAdjustmentBase):
    id: UUID
    user_id: UUID
    adjustment_date: date
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# 통계용
class AssetAdjustmentStats(BaseModel):
    total_income_missing: int = Field(defualt=0, description="수입 누락 합계")
    total_expense_missing: int = Field(defualt=0, description="지출 누락 합계")
    net_adjustment: int = Field(
        defualt=0, description="순 조정 금액 (income - expense)"
    )
    adjustment_count: int = Field(defualt=0, description="조정 건수")
