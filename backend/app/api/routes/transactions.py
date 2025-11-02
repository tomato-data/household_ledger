from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import date

from app.core.database import get_db
from app.api.dependencies.auth import get_current_user
from app.models.user import User as UserModel
from app.models.enums import TransactionType
from app.schemas import (
    Transaction,
    TransactionCreate,
    TransactionUpdate,
    TransactionStats,
    CategoryExpenseStats,
)
from app.services.transaction_service import TransactionService

router = APIRouter(
    prefix="/transactions",
    tags=["transactions"],
)


# 목록 조회 (날짜 필터링 포함)
@router.get("", response_model=List[Transaction])
def get_transactions(
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[date] = None,  # YYYY-MM-DD 형식
    end_date: Optional[date] = None,  # YYYY-MM-DD 형식
    category_id: Optional[UUID] = None,
    type: Optional[str] = None,  # 'income' 또는 'expense'
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    트랜잭션 목록 조회 (필터링 지원)
    - start_date, end_date: 날짜 범위 필터
    - category_id: 카테고리 ID 필터
    - type: 거래 유형 필터 (income/expense)
    """
    service = TransactionService(db)
    transactions = service.get_transactions(
        current_user.id,
        skip,
        limit,
        start_date,
        end_date,
        category_id,
        type,
    )
    return transactions


# 단일 조회
@router.get("/{transaction_id}", response_model=Transaction)
def get_transaction(
    transaction_id: UUID,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """특정 트랜잭션 조회"""
    service = TransactionService(db)
    transaction = service.get_transaction(current_user.id, transaction_id)
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )
    return transaction


# 생성
@router.post("", response_model=Transaction, status_code=status.HTTP_201_CREATED)
def create_transaction(
    transaction: TransactionCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """새 트랜잭션 생성"""
    service = TransactionService(db)
    new_transaction = service.create_transaction(transaction, current_user.id)
    if not new_transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )
    return new_transaction


# 수정
@router.patch("/{transaction_id}", response_model=Transaction)
def update_transaction(
    transaction_id: UUID,
    transaction_update: TransactionUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """트랜잭션 수정"""
    # 1. 기존 트랜잭션 조회 (eager loading)
    service = TransactionService(db)
    updated_transaction = service.update_transaction(
        transaction_id, transaction_update, current_user.id
    )

    if not updated_transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )
    return updated_transaction


# 삭제
@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: UUID,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """트랜잭션 삭제"""
    service = TransactionService(db)
    success = service.delete_transaction(transaction_id, current_user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )
    return


# 통계 조회
@router.get("/stats/summary", response_model=TransactionStats)
def get_transaction_stats(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    사용자의 전체 트랜잭션 통계 조회
    - 전체 수입 합계
    - 전체 지출 합계
    - 순자산
    - 트랜잭션 수 (Confirmed만)
    """
    service = TransactionService(db)
    stats = service.get_stats(current_user.id)
    return stats


@router.get("/stats/category-breakdown", response_model=List[CategoryExpenseStats])
def get_category_expense_breakdown(
    start_date: date,
    end_date: date,
    type: TransactionType = TransactionType.EXPENSE,  # 기본값: 지출
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    기간별 카테고리별 지출/수입 통계

    - PosrgreSQL GROUP BY로 집계
    - Category 정보 JOIN
    - Backend에서 percentage 계산
    """
    service = TransactionService(db)
    breakdown = service.get_category_breakdown(
        current_user.id, start_date, end_date, type
    )
    return breakdown
