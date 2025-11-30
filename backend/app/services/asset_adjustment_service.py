from typing import List, Optional
from uuid import UUID
from datetime import date

from sqlalchemy.orm import Session

from app.models.asset_adjustment import AssetAdjustment
from app.models.enums import AdjustmentType
from app.schemas.asset_adjustment import (
    AssetAdjustmentCreate,
    AssetAdjustmentUpdate,
    AssetAdjustmentStats,
)
from app.crud.asset_adjustment_crud import (
    get_adjustments_by_user,
    get_adjustment_by_id,
    create_adjustment as create_adjustment_crud,
    update_adjustment as update_adjustment_crud,
    delete_adjustment as delete_adjustment_crud,
    get_adjustment_stats,
)


class AssetAdjustmentService:
    """자산 조정 비즈니스 로직"""

    def __init__(self, db: Session):
        self.db = db

    def get_adjustments(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100,
        adjustment_type: Optional[AdjustmentType] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[AssetAdjustment]:
        """조정 목록 조회"""
        return get_adjustments_by_user(
            self.db,
            user_id,
            skip=skip,
            limit=limit,
            adjustment_type=adjustment_type,
            start_date=start_date,
            end_date=end_date,
        )

    def get_adjustment(
        self,
        adjustment_id: UUID,
        user_id: UUID,
    ) -> Optional[AssetAdjustment]:
        """단일 조정 조회"""
        return get_adjustment_by_id(self.db, adjustment_id, user_id)

    def create_adjustment(
        self,
        adjustment: AssetAdjustmentCreate,
        user_id: UUID,
    ) -> AssetAdjustment:
        """조정 생성"""
        new_adjustment = create_adjustment_crud(self.db, adjustment, user_id)
        self.db.commit()
        self.db.refresh(new_adjustment)
        return new_adjustment

    def update_adjustment(
        self,
        adjustment_id: UUID,
        adjustment_update: AssetAdjustmentUpdate,
        user_id: UUID,
    ) -> Optional[AssetAdjustment]:
        """조정 수정"""
        db_adjustment = get_adjustment_by_id(self.db, adjustment_id, user_id)
        if not db_adjustment:
            return None

        updated = update_adjustment_crud(self.db, db_adjustment, adjustment_update)
        self.db.commit()
        self.db.refresh(updated)
        return updated

    def delete_adjustment(
        self,
        adjustment_id: UUID,
        user_id: UUID,
    ) -> bool:
        """조정 삭제"""
        db_adjustment = get_adjustment_by_id(self.db, adjustment_id, user_id)
        if not db_adjustment:
            return False

        delete_adjustment_crud(self.db, db_adjustment)
        self.db.commit()
        return True

    def get_stats(self, user_id: UUID) -> AssetAdjustmentStats:
        """조정 통계 조회"""
        stats_dict = get_adjustment_stats(self.db, user_id)
        return AssetAdjustmentStats(**stats_dict)
