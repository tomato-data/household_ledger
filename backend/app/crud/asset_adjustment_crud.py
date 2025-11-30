from typing import List, Optional
from uuid import UUID
from datetime import date

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.asset_adjustment import AssetAdjustment
from app.models.enums import AdjustmentType
from app.schemas.asset_adjustment import AssetAdjustmentCreate, AssetAdjustmentUpdate


def get_adjustments_by_user(
    db: Session,
    user_id: UUID,
    skip: int = 0,
    limit: int = 100,
    adjustment_type: Optional[AdjustmentType] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> List[AssetAdjustment]:
    """사용자의 조정 목록 조회 (필터링 지원)"""
    query = db.query(AssetAdjustment).filter(AssetAdjustment.user_id == user_id)

    if adjustment_type:
        query = query.filter(AssetAdjustment.type == adjustment_type)
    if start_date:
        query = query.filter(AssetAdjustment.adjustment_date >= start_date)
    if end_date:
        query = query.filter(AssetAdjustment.adjustment_date <= end_date)

    return (
        query.order_by(AssetAdjustment.adjustment_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_adjustment_by_id(
    db: Session,
    adjustment_id: UUID,
    user_id: UUID,
) -> Optional[AssetAdjustment]:
    """단일 조정 조회 (소유권 확인 포함)"""
    return (
        db.query(AssetAdjustment)
        .filter(
            AssetAdjustment.id == adjustment_id,
            AssetAdjustment.user_id == user_id,
        )
        .first()
    )


def create_adjustment(
    db: Session,
    adjustment: AssetAdjustmentCreate,
    user_id: UUID,
) -> AssetAdjustment:
    """조정 생성"""
    db_adjustment = AssetAdjustment(
        user_id=user_id,
        amount=adjustment.amount,
        type=adjustment.type,
        reason=adjustment.reason,
        adjustment_date=adjustment.adjustment_date,
    )
    db.add(db_adjustment)
    db.flush()  # ID 생성을 위해 flush (commit은 Service에서)
    return db_adjustment


def update_adjustment(
    db: Session,
    db_adjustment: AssetAdjustment,
    adjustment_update: AssetAdjustmentUpdate,
) -> AssetAdjustment:
    """조정 수정"""
    update_data = adjustment_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_adjustment, field, value)
    db.flush()
    return db_adjustment


def delete_adjustment(
    db: Session,
    db_adjustment: AssetAdjustment,
) -> None:
    """조정 삭제"""
    db.delete(db_adjustment)
    db.flush()


def get_adjustment_stats(
    db: Session,
    user_id: UUID,
) -> dict:
    """조정 통계 조회"""
    # 수입 누락 합계
    income_missing = (
        db.query(func.coalesce(func.sum(AssetAdjustment.amount), 0))
        .filter(
            AssetAdjustment.user_id == user_id,
            AssetAdjustment.type == AdjustmentType.INCOME_MISSING,
        )
        .scalar()
    )
    expense_missing = (
        db.query(func.coalesce(func.sum(AssetAdjustment.amount), 0))
        .filter(
            AssetAdjustment.user_id == user_id,
            AssetAdjustment.type == AdjustmentType.EXPENSE_MISSING,
        )
        .scalar()
    )

    # 조정 건수
    count = (
        db.query(func.count(AssetAdjustment.id))
        .filter(
            AssetAdjustment.user_id == user_id,
        )
        .scalar()
    )

    return {
        "total_income_missing": income_missing,
        "total_expense_missing": expense_missing,
        "net_adjustment": income_missing - expense_missing,
        "adjustment_count": count,
    }
