from sqlalchemy.orm import Session

from uuid import UUID
from typing import List, Optional
from app.models.category import Category as CategoryModel
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryReorder
from app.crud.category_crud import (
    get_categories_by_user,
    get_category_by_id,
    create_category,
    update_category,
    delete_category,
    reorder_categories,
)


class CategoryService:
    def __init__(self, db: Session):
        self.db = db

    def get_categories(
        self, user_id: UUID, skip: int = 0, limit: int = 100
    ) -> List[CategoryModel]:
        return get_categories_by_user(self.db, user_id, skip, limit)

    def get_category(self, user_id: UUID, category_id: UUID) -> Optional[CategoryModel]:
        return get_category_by_id(self.db, category_id, user_id)

    def create_category(self, category: CategoryCreate, user_id: UUID):
        new_category = create_category(self.db, category, user_id)
        self.db.commit()
        self.db.refresh(new_category)
        return new_category

    def update_category(
        self, category_id: UUID, category_update: CategoryUpdate, user_id: UUID
    ):
        category = get_category_by_id(self.db, category_id, user_id)
        if not category:
            return None
        updated_category = update_category(self.db, category, category_update)
        self.db.commit()
        self.db.refresh(updated_category)
        return updated_category

    def delete_category(self, category_id: UUID, user_id: UUID):
        category = get_category_by_id(self.db, category_id, user_id)
        if not category:
            return False
        delete_category(self.db, category)
        self.db.commit()
        return True

    def reorder_categories(self, reorder_data: List[CategoryReorder], user_id: UUID):
        for item in reorder_data:
            category = get_category_by_id(self.db, item.category_id, user_id)
            if not category:
                return False
        reorder_categories(self.db, user_id, reorder_data)
        self.db.commit()
        return True
