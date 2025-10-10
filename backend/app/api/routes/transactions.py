from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date

from app.api.dependencies.auth import get_current_user
from app.models.user import User as UserModel
from app.core.database import get_db
from app.schemas import Transaction, TransactionCreate, TransactionUpdate
from app.models.transaction import Transaction as TransactionModel
from app.models.category import Category as CategoryModel

router = APIRouter(
    prefix="/transactions",
    tags=["transactions"],
)


# 목록 조회 (날짜 필터링 포함)
@router.get("/", response_model=List[Transaction])
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
    query = db.query(TransactionModel)
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
@router.post("/", response_model=Transaction, status_code=status.HTTP_201_CREATED)
def create_transaction(
    transaction: TransactionCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """새 트랜잭션 생성"""
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
    new_transaction = TransactionModel(
        **transaction.model_dump(),
        user_id=current_user.id,  # user id 변경 필요
    )
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)
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
    for field, value in transaction_update.model_dump(exclude_unset=True).items():
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
