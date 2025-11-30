from typing import List, Optional
from uuid import UUID
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.dependencies.auth import get_current_user
from app.models.user import User
from app.models.enums import AdjustmentType
from app.schemas.asset_adjustment import (
    AssetAdjustmentCreate,
    AssetAdjustmentUpdate,
    AssetAdjustmentResponse,
    AssetAdjustmentStats,
)
from app.services.asset_adjustment_service import AssetAdjustmentService


router = APIRouter(prefix="/asset-adjustments", tags=["asset-adjustments"])


@router.get("/", response_model=List[AssetAdjustmentResponse])
def get_adjustments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    adjustment_type: Optional[AdjustmentType] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """자산 조정 목록 조회"""
    service = AssetAdjustmentService(db)
    return service.get_adjustments(
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        adjustment_type=adjustment_type,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/stats", response_model=AssetAdjustmentStats)
def get_adjustment_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """자산 조정 통계 조회"""
    service = AssetAdjustmentService(db)
    return service.get_stats(current_user.id)


@router.get("/{adjustment_id}", response_model=AssetAdjustmentResponse)
def get_adjustment(
    adjustment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """단일 자산 조정 조회"""
    service = AssetAdjustmentService(db)
    adjustment = service.get_adjustment(adjustment_id, current_user.id)
    if not adjustment:
        raise HTTPException(status_code=404, detail="Adjustment not found")
    return adjustment


@router.post("/", response_model=AssetAdjustmentResponse, status_code=201)
def create_adjustment(
    adjustment: AssetAdjustmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """자산 조정 생성"""
    service = AssetAdjustmentService(db)
    return service.create_adjustment(adjustment, current_user.id)


@router.patch("/{adjustment_id}", response_model=AssetAdjustmentResponse)
def update_adjustment(
    adjustment_id: UUID,
    adjustment_update: AssetAdjustmentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """자산 조정 수정"""
    service = AssetAdjustmentService(db)
    updated = service.update_adjustment(
        adjustment_id, adjustment_update, current_user.id
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Adjustment not found")
    return updated


@router.delete("/{adjustment_id}", status_code=204)
def delete_adjustment(
    adjustment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """자산 조정 삭제"""
    service = AssetAdjustmentService(db)
    success = service.delete_adjustment(adjustment_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Adjustment not found")
    return None
