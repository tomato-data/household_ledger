#!/usr/bin/env python3
"""
IndexedDB JSON 백업 파일을 PostgreSQL로 마이그레이션하는 스크립트
"""
import json
import sys
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.transaction import Transaction as TransactionModel
from app.models.category import Category as CategoryModel

USER_ID = "b5a9fccf-db4a-4a5a-86e6-51a3c684f6d9"


def load_json_backup(file_path: str) -> dict:
    """JSON 백업 파일 로드"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def get_category_mapping(db: Session, user_id: str) -> dict:
    """카테고리 이름 → UUID 매핑 생성"""
    categories = db.query(CategoryModel).filter(CategoryModel.user_id == user_id).all()

    mapping = {}
    for cat in categories:
        mapping[cat.name] = str(cat.id)

    print(f"✅ 카테고리 매핑 생성 완료: {len(mapping)}개")
    for name, cat_id in mapping.items():
        print(f"  - {name}: {cat_id}")

    return mapping


def migrate_transactions(db: Session, backup_data: dict, user_id: str, category_mapping: dict):
    """트랜잭션 마이그레이션"""
    transactions = backup_data.get('transactions', [])

    success_count = 0
    skip_count = 0
    error_count = 0

    print(f"\n📦 총 {len(transactions)}개의 트랜잭션을 마이그레이션합니다...")

    for idx, tx in enumerate(transactions, 1):
        try:
            # 카테고리 이름 → UUID 변환
            category_name = tx.get('category')
            category_id = category_mapping.get(category_name)

            if not category_id:
                print(f"⚠️  [{idx}/{len(transactions)}] 카테고리 '{category_name}' 없음 - 스킵: {tx['description']}")
                skip_count += 1
                continue

            # 날짜 파싱 (ISO 8601)
            date_str = tx.get('date')
            if date_str.endswith('Z'):
                date_str = date_str[:-1] + '+00:00'
            date = datetime.fromisoformat(date_str)

            # Transaction 객체 생성
            transaction = TransactionModel(
                id=uuid.UUID(tx['id']),  # 문자열 → UUID 변환
                user_id=uuid.UUID(user_id),  # 문자열 → UUID 변환
                date=date,
                description=tx['description'],
                amount=tx['amount'],
                type=tx['type'],  # 'income' or 'expense'
                category_id=uuid.UUID(category_id),  # 문자열 → UUID 변환
                status=tx['status'],  # 'confirmed', 'scheduled', 'pending'
                recurring_id=None  # recurring은 나중에 마이그레이션
            )

            db.add(transaction)
            success_count += 1

            if idx % 50 == 0:
                print(f"⏳ 진행 중: {idx}/{len(transactions)} ({success_count} 성공, {skip_count} 스킵)")

        except Exception as e:
            error_count += 1
            print(f"❌ [{idx}/{len(transactions)}] 에러: {tx['description']} - {str(e)}")

    # 커밋
    try:
        db.commit()
        print(f"\n✅ 마이그레이션 완료!")
        print(f"  - 성공: {success_count}개")
        print(f"  - 스킵: {skip_count}개")
        print(f"  - 에러: {error_count}개")
    except Exception as e:
        db.rollback()
        print(f"\n❌ 커밋 실패: {str(e)}")
        raise


def main():
    if len(sys.argv) < 2:
        print("사용법: python migrate_indexeddb.py <백업파일.json>")
        print("예시: python migrate_indexeddb.py backup/가계부_백업_2025-10-12.json")
        sys.exit(1)

    backup_file = sys.argv[1]

    print(f"🚀 IndexedDB → PostgreSQL 마이그레이션 시작")
    print(f"📄 백업 파일: {backup_file}")
    print(f"👤 사용자 ID: {USER_ID}\n")

    # JSON 로드
    backup_data = load_json_backup(backup_file)
    print(f"✅ JSON 파일 로드 완료: {len(backup_data['transactions'])}개 트랜잭션")

    # DB 연결
    db = SessionLocal()

    try:
        # 카테고리 매핑 생성
        category_mapping = get_category_mapping(db, USER_ID)

        if not category_mapping:
            print("❌ 카테고리가 없습니다. 먼저 프론트엔드에서 로그인하여 기본 카테고리를 생성하세요.")
            sys.exit(1)

        # 트랜잭션 마이그레이션
        migrate_transactions(db, backup_data, USER_ID, category_mapping)

        print("\n🎉 마이그레이션 완료!")

    except Exception as e:
        print(f"\n❌ 마이그레이션 실패: {str(e)}")
        db.rollback()
        sys.exit(1)

    finally:
        db.close()


if __name__ == "__main__":
    main()