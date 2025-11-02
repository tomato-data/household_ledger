import gzip
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session
from uuid import UUID
from app.schemas.backup import BackupData, BackupMetadata
from app.crud.backup_crud import (
    get_all_user_data,
    delete_all_user_data,
    bulk_insert_categories,
    bulk_insert_transactions,
    bulk_insert_recurring_transactions,
)


class BackupService:
    def __init__(self, db: Session):
        self.db = db

    def create_backup(self, user_id: UUID) -> bytes:
        data = get_all_user_data(self.db, user_id)
        backup_data = BackupData(
            version="1.0",
            created_at=datetime.now(),
            user_id=user_id,
            categories=data["categories"],
            transactions=data["transactions"],
            recurring_transactions=data["recurring_transactions"],
        )
        backup_data_json = backup_data.model_dump_json()
        compressed = gzip.compress(backup_data_json.encode())
        return compressed

    def restore_backup(
        self, user_id: UUID, file_content: bytes, overwrite: bool = False
    ) -> Optional[BackupMetadata]:
        try:
            # 1. gzip 해제 + JSON 파싱
            backup_data_json = gzip.decompress(file_content).decode("utf-8")
            backup_data = BackupData.model_validate_json(backup_data_json)

            # # 2. user_id 검증 (보안)
            # if backup_data.user_id != user_id:
            #     return None

            # 3. overwrite면 기존 데이터 삭제
            if overwrite:
                delete_all_user_data(self.db, user_id)

            # 4. Pydantic -> SQLAlchemy 모델 변환
            from app.models.category import Category as CategoryModel
            from app.models.transaction import Transaction as TransactionModel
            from app.models.recurring_transaction import (
                RecurringTransaction as RecurringTransactionModel,
            )

            # Category 삽입 (ID 매핑 테이블 생성)
            category_id_map = {}  # 백업 ID -> 신규 ID 매핑
            category_models = []
            for cat in backup_data.categories:
                old_id = cat.id
                new_category = CategoryModel(
                    user_id=user_id,
                    name=cat.name,
                    emoji=cat.emoji,
                    order=cat.order,
                )
                category_models.append(new_category)
                # flush 후 새 ID를 매핑할 수 있도록 준비

            bulk_insert_categories(self.db, category_models)
            self.db.flush()  # ID 생성

            # ID 매핑 테이블 완성
            for i, cat in enumerate(backup_data.categories):
                category_id_map[cat.id] = category_models[i].id

            # Transaction 삽입 (category_id 매핑)
            transaction_models = []
            for txn in backup_data.transactions:
                new_transaction = TransactionModel(
                    user_id=user_id,
                    date=txn.date,
                    description=txn.description,
                    amount=txn.amount,
                    type=txn.type,
                    category_id=category_id_map.get(txn.category_id),
                    status=txn.status,
                    recurring_id=txn.recurring_id,
                )
                transaction_models.append(new_transaction)
            bulk_insert_transactions(self.db, transaction_models)

            # RecurringTransaction 삽입
            recurring_models = []
            recurring_id_map = {}
            for rec in backup_data.recurring_transactions:
                new_recurring = RecurringTransactionModel(
                    user_id=user_id,
                    template_name=rec.template_name,
                    description=rec.description,
                    amount=rec.amount,
                    type=rec.type,
                    frequency=rec.frequency,
                    start_date=rec.start_date,
                    end_date=rec.end_date,
                    day_of_month=rec.day_of_month,
                    is_active=rec.is_active,
                    is_variable_amount=rec.is_variable_amount,
                )
                recurring_models.append(new_recurring)

            bulk_insert_recurring_transactions(self.db, recurring_models)
            self.db.flush()

            # recurring_id 매핑
            for i, rec in enumerate(backup_data.recurring_transactions):
                recurring_id_map[rec.id] = recurring_models[i].id

            # Transaction 업데이트 (recurring_id 매핑)
            for txn_model in transaction_models:
                if txn_model.recurring_id:
                    txn_model.recurring_id = recurring_id_map[txn_model.recurring_id]

            self.db.commit()

            return BackupMetadata(
                version=backup_data.version,
                created_at=backup_data.created_at,
                user_id=user_id,
                categories_count=len(backup_data.categories),
                transactions_count=len(backup_data.transactions),
                recurring_transactions_count=len(backup_data.recurring_transactions),
            )
        except Exception as e:
            self.db.rollback()
            return None

    def get_backup_metadata(self, file_content: bytes) -> Optional[BackupMetadata]:
        """백업 파일 메타데이터만 추출 (복원 전 미리보기)"""
        try:
            # BackupData 전체 파싱
            backup_data_json = gzip.decompress(file_content).decode("utf-8")
            backup_data = BackupData.model_validate_json(backup_data_json)

            # 메타데이터만 추출
            return BackupMetadata(
                version=backup_data.version,
                created_at=backup_data.created_at,
                user_id=backup_data.user_id,
                categories_count=len(backup_data.categories),
                transactions_count=len(backup_data.transactions),
                recurring_transactions_count=len(backup_data.recurring_transactions),
            )
        except Exception as e:
            return None
