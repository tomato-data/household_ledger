from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional

from app.models.category import Category as CategoryModel
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryReorder


def get_categories_by_user(
    db: Session, user_id: UUID, skip: int = 0, limit: int = 100
) -> List[CategoryModel]:
    """
    사용자의 모든 카테고리 조회
    """
    return (
        db.query(CategoryModel)
        .filter(CategoryModel.user_id == user_id)
        .order_by(CategoryModel.order.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_category_by_id(
    db: Session, category_id: UUID, user_id: UUID
) -> Optional[CategoryModel]:
    """특정 카테고리 조회"""
    return (
        db.query(CategoryModel)
        .filter(CategoryModel.user_id == user_id)
        .filter(CategoryModel.id == category_id)
        .first()
    )


def create_category(
    db: Session, category: CategoryCreate, user_id: UUID
) -> CategoryModel:
    """
    카테고리 생성

    commit은 호출자(Service/Router)가 담당
    - 왜? 여러 CRUD를 하나의 트랜잭션으로 묶을 수 있게
    """
    new_category = CategoryModel(
        **category.model_dump(),
        user_id=user_id,
    )
    db.add(new_category)
    db.flush()  # ID 생성 (commit 전)
    return new_category


def update_category(
    db: Session, category: CategoryModel, category_update: CategoryUpdate
) -> CategoryModel:
    """
    카테고리 수정

    파라미터로 이미 조회된 객체를 받음:
    - 중복 조회 방지
    - 존재 여부 검증은 호출자가 담당
    """
    for field, value in category_update.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    db.flush()
    return category


def delete_category(db: Session, category: CategoryModel) -> None:
    """카테고리 삭제"""
    db.delete(category)
    db.flush()


def reorder_categories(
    db: Session, user_id: UUID, reorder_data: List[CategoryReorder]
) -> None:
    """카테고리 순서 일괄 업데이트"""
    for item in reorder_data:
        db.query(CategoryModel).filter(
            CategoryModel.id == item.category_id,
            CategoryModel.user_id == user_id,
        ).update({"order": item.order}, synchronize_session=False)
    db.flush()
