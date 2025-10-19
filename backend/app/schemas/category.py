from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


# 1. CategoryBase
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    emoji: Optional[str] = Field(None, max_length=10)
    order: Optional[int] = 0


# 2. CategoryCreate 생성 요청
class CategoryCreate(CategoryBase):
    pass


# 3. CategoryUpdate 수정 요청
class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    emoji: Optional[str] = Field(None, max_length=10)


# 4. CategoryInDB DB 저장 형식
class CategoryInDB(CategoryBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime


# 5. Category - API 응답용
class Category(CategoryInDB):
    class Config:
        from_attributes = True  # Pydantic v2
        # orm_mode = True # Pydantic v1

# 6. CategoryReorder 순서 변경 요청
class CategoryReorder(BaseModel):
    category_id: UUID
    order: int