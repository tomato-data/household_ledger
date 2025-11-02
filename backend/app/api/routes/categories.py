from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.api.dependencies.auth import get_current_user
from app.core.database import get_db
from app.schemas import Category, CategoryCreate, CategoryUpdate, CategoryReorder
from app.models.user import User as UserModel
from app.services.category_service import CategoryService


router = APIRouter(
    prefix="/categories",  # 모든 엔드포인트 앞에 /categories 붙음
    tags=["categories"],  # Swagger 문서에서 그룹 이름
)


# 1. 카테고리 목록 조회
@router.get("/", response_model=List[Category])
def get_categories(
    skip: int = 0,
    limit: int = 100,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    모든 카테고리 조회 (사용자별 격리)
    - skip: 건너뛸 개수 (페이지네이션)
    - limit: 조회할 개수 (페이지네이션)
    """
    service = CategoryService(db)
    categories = service.get_categories(current_user.id, skip, limit)
    return categories


# 2. 특정 카테고리 조회
@router.get("/{category_id}", response_model=Category)
def get_category(
    category_id: UUID,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    특정 ID의 카테고리 조회(본인 것만)
    """
    service = CategoryService(db)
    category = service.get_category(current_user.id, category_id)

    # None 체크 (Service가 None 반환하면 404 예외 발생)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )
    return category


# 3. 카테고리 생성
@router.post("/", response_model=Category, status_code=status.HTTP_201_CREATED)
def create_category(
    category: CategoryCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    새 카테고리 생성(본인 것만)
    """
    service = CategoryService(db)
    new_category = service.create_category(category, current_user.id)
    return new_category


# 4. 카테고리 수정
@router.patch("/{category_id}", response_model=Category)
def update_cateogry(
    category_id: UUID,
    category_update: CategoryUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    카테고리 수정(본인 것만)
    """
    service = CategoryService(db)
    updated_category = service.update_category(
        category_id, category_update, current_user.id
    )

    if not updated_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )
    return updated_category


# 5. 카테고리 삭제
@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: UUID,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    카테고리 삭제(본인 것만)
    """
    service = CategoryService(db)
    success = service.delete_category(category_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )
    return


# 6. 카테고리 순서 변경
@router.patch("/batch/reorder")
def reorder_categories(
    reorder_data: List[CategoryReorder],
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """카테고리 순서 일괄 업데이트"""
    service = CategoryService(db)
    success = service.reorder_categories(reorder_data, current_user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to reorder categories",
        )

    return {"message": "Categories reordered successfully"}
