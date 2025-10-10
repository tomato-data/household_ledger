from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.schemas import Category, CategoryCreate, CategoryUpdate
from app.models.category import Category as CategoryModel

router = APIRouter(
    prefix="/categories",  # 모든 엔드포인트 앞에 /categories 붙음
    tags=["categories"],  # Swagger 문서에서 그룹 이름
)


# 1. 카테고리 목록 조회
@router.get("/", response_model=List[Category])
def get_categories(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """
    모든 카테고리 조회
    - skip: 건너뛸 개수 (페이지네이션)
    - limit: 조회할 개수 (페이지네이션)
    """
    categories = db.query(CategoryModel).offset(skip).limit(limit).all()
    return categories


# 2. 특정 카테고리 조회
@router.get("/{category_id}", response_model=Category)
def get_category(
    category_id: UUID,
    db: Session = Depends(get_db),
):
    """
    특정 ID의 카테고리 조회
    """
    category = db.query(CategoryModel).filter(CategoryModel.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )
    return category


# 3. 카테고리 생성
@router.post("/", response_model=Category, status_code=status.HTTP_201_CREATED)
def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    """
    새 카테고리 생성
    """
    try:

        new_category = CategoryModel(
            **category.model_dump(),
            user_id="32db540c-e343-45d5-aebc-169b078dc0c8"  # 테스트용 고정 ID
        )
        db.add(new_category)
        db.commit()
        db.refresh(new_category)
        return new_category
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


# 4. 카테고리 수정
@router.patch("/{category_id}", response_model=Category)
def update_cateogry(
    category_id: UUID,
    category_update: CategoryUpdate,
    db: Session = Depends(get_db),
):
    """
    카테고리 수정
    """
    category = db.query(CategoryModel).filter(CategoryModel.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )
    for field, value in category_update.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category


# 5. 카테고리 삭제
@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: UUID,
    db: Session = Depends(get_db),
):
    """
    카테고리 삭제
    """
    category = db.query(CategoryModel).filter(CategoryModel.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )
    db.delete(category)
    db.commit()
    return
