from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date

from app.core.database import get_db
from app.api.dependencies.auth import get_current_user
from app.models.user import User as UserModel
from app.models.enums import TransactionType, TransactionStatus
from app.schemas import (
    Transaction,
    TransactionCreate,
    TransactionUpdate,
    TransactionStats,
    CategoryExpenseStats,
)
from app.models.transaction import Transaction as TransactionModel
from app.models.category import Category as CategoryModel

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
    query = db.query(TransactionModel).options(joinedload(TransactionModel.category))
    query = query.filter(TransactionModel.user_id == current_user.id)
    if start_date:
        query = query.filter(TransactionModel.date >= start_date)
    if end_date:
        query = query.filter(TransactionModel.date <= end_date)
    if category_id:
        query = query.filter(TransactionModel.category_id == category_id)
    if type:
        query = query.filter(TransactionModel.type == type)
    query = query.order_by(TransactionModel.date.desc())
    transaction = query.offset(skip).limit(limit).all()
    return transaction


# 단일 조회
@router.get("/{transaction_id}", response_model=Transaction)
def get_transaction(
    transaction_id: UUID,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """특정 트랜잭션 조회"""
    transaction = (
        db.query(TransactionModel)
        .options(joinedload(TransactionModel.category))
        .filter(TransactionModel.user_id == current_user.id)
        .filter(TransactionModel.id == transaction_id)
        .first()
    )
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
    # 1. 카테고리 검증
    category = (
        db.query(CategoryModel)
        .filter(CategoryModel.user_id == current_user.id)
        .filter(CategoryModel.id == transaction.category_id)
        .first()
    )
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )
    # 2. 트랜잭션 생성
    new_transaction = TransactionModel(
        **transaction.model_dump(),
        user_id=current_user.id,  # user id 변경 필요
    )
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)

    # 3. 이미 조회한 category를 명시적으로 할당 (N+1 방지)
    new_transaction.category = category

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
    transaction = (
        db.query(TransactionModel)
        .options(joinedload(TransactionModel.category))
        .filter(TransactionModel.user_id == current_user.id)
        .filter(TransactionModel.id == transaction_id)
        .first()
    )
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )
    # 2. category_id 변경 시 검증
    updated_data = transaction_update.model_dump(exclude_unset=True)
    if "category_id" in updated_data:
        new_category = (
            db.query(CategoryModel)
            .filter(CategoryModel.user_id == current_user.id)
            .filter(CategoryModel.id == updated_data["category_id"])
            .first()
        )
        if not new_category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
            )
        # 미리 할당 (commit 전에)
        transaction.category = new_category
    # 3. 트랜잭션 업데이트
    for field, value in updated_data.items():
        setattr(transaction, field, value)
    db.commit()
    db.refresh(transaction)
    return transaction


# 삭제
@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: UUID,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """트랜잭션 삭제"""
    transaction = (
        db.query(TransactionModel)
        .filter(TransactionModel.user_id == current_user.id)
        .filter(TransactionModel.id == transaction_id)
        .first()
    )
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )
    db.delete(transaction)
    db.commit()
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
    # 전체 수입 합계
    total_income = (
        db.query(func.sum(TransactionModel.amount))
        .filter(TransactionModel.user_id == current_user.id)
        .filter(TransactionModel.type == "income")
        .filter(TransactionModel.status == "confirmed")
        .scalar()
        or 0
    )
    # 전체 지출 합계
    total_expense = (
        db.query(func.sum(TransactionModel.amount))
        .filter(TransactionModel.user_id == current_user.id)
        .filter(TransactionModel.type == "expense")
        .filter(TransactionModel.status == "confirmed")
        .scalar()
        or 0
    )

    # 트랜잭션 수
    transaction_count = (
        db.query(func.count(TransactionModel.id))
        .filter(TransactionModel.user_id == current_user.id)
        .filter(TransactionModel.status == "confirmed")
        .scalar()
        or 0
    )

    return TransactionStats(
        total_income=total_income,
        total_expense=total_expense,
        net_asset=total_income - total_expense,
        transaction_count=transaction_count,
    )


@router.get("/stats/category-breakdown", response_model=List[CategoryExpenseStats])
def get_category_expense_breakdown(
    start_date: date,
    end_date: date,
    type: TransactionType = TransactionType.EXPENSE, # 기본값: 지출
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    기간별 카테고리별 지출/수입 통계

    - PosrgreSQL GROUP BY로 집계
    - Category 정보 JOIN
    - Backend에서 percentage 계산
    """

    # PostgreSQL 집계 쿼리
    query = (
        db.query(
            CategoryModel.id.label("category_id"),
            CategoryModel.name.label("category_name"),
            CategoryModel.emoji.label("category_emoji"),
            func.sum(TransactionModel.amount).label("total_amount"),
            func.count(TransactionModel.id).label("transaction_count"),
        )
        .join(CategoryModel, TransactionModel.category_id == CategoryModel.id)
        .filter(TransactionModel.user_id == current_user.id)
        .filter(TransactionModel.type == type)
        .filter(TransactionModel.status == TransactionStatus.CONFIRMED)
        .filter(TransactionModel.date >= start_date)
        .filter(TransactionModel.date <= end_date)
        .group_by(CategoryModel.id, CategoryModel.name, CategoryModel.emoji)
        .order_by(func.sum(TransactionModel.amount).desc())
    )

    results = query.all()

    # Backend에서 percentage 계산 (간단한 로직)
    total = sum(r.total_amount for r in results)

    return [
        CategoryExpenseStats(
            category_id=r.category_id,
            category_name=r.category_name,
            category_emoji=r.category_emoji,
            total_amount=r.total_amount,
            transaction_count=r.transaction_count,
            percentage=r.total_amount / total if total > 0 else 0,
        ) for r in results
    ]