from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import jwt, JWTError
import json
from uuid import UUID

from app.core.database import get_db
from app.core.redis import get_redis
from app.models.user import User as UserModel
from app.models.category import Category as CategoryModel
from redis import asyncio as aioredis

# Bearer 토큰 추출
security = HTTPBearer()


def create_default_categories(db: Session, user_id: UUID):
    """첫 로그인 시 기본 카테고리 생성"""

    default_categories = [
        {"name": "식비", "emoji": "🍽️"},
        {"name": "간식류", "emoji": "🍪"},
        {"name": "카페", "emoji": "☕"},
        {"name": "교통비", "emoji": "🚗"},
        {"name": "문화생활", "emoji": "🎭"},
        {"name": "의류", "emoji": "👔"},
        {"name": "생필품", "emoji": "🛒"},
        {"name": "의료비", "emoji": "🏥"},
        {"name": "월급", "emoji": "💰"},
        {"name": "월세", "emoji": "🏠"},
        {"name": "통신비", "emoji": "📱"},
        {"name": "공과금", "emoji": "⚡"},
        {"name": "기타", "emoji": "📝"},
    ]

    categories = [
        CategoryModel(user_id=user_id, name=cat["name"], emoji=cat["emoji"])
        for cat in default_categories
    ]

    try:
        db.bulk_save_objects(categories)
        db.commit()
        print(f"✅ Created {len(categories)} default categories for user {user_id}")
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating default categories: {str(e)}")


# JWT 검증 함수
async def verify_clerk_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """
    Clerk JWT 토큰 검증
    Returns: clerk_user_id
    """
    token = credentials.credentials

    try:
        # 단순 디코딩 (개발/테스트용)
        # 프로덕션에서는 Clerk Public Key로 검증 필요
        payload = jwt.decode(
            token,
            key="",  # 빈 키 (서명 검증 안 할 때)
            options={"verify_signature": False},  # 임시로 서명 검증 스킵
        )

        # clerk_user_id 추출 (sub 클레임)
        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject",
            )
        return clerk_user_id

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {str(e)}"
        )


async def get_current_user(
    clerk_user_id: str = Depends(verify_clerk_token),
    db: Session = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> UserModel:
    """현재 인증된 사용자 가져오기(Redis 캐싱 포함)"""
    cache_key = f"user:{clerk_user_id}"

    # 1. Redis 캐시 확인
    cached = await redis.get(cache_key)
    if cached:
        user_data = json.loads(cached)
        # DB 세션에서 User 객체 가져오기 (캐시된 ID 사용)
        user = db.query(UserModel).filter(UserModel.id == user_data["id"]).first()
        if user:
            return user

    # 2. DB에서 사용자 조회
    user = db.query(UserModel).filter(UserModel.clerk_user_id == clerk_user_id).first()

    # 3. 사용자가 없으면 자동 생성 (첫 로그인)
    if not user:
        user = UserModel(clerk_user_id=clerk_user_id)
        db.add(user)
        db.commit()
        db.refresh(user)

        # 기본 카테고리 생성
        create_default_categories(db, user.id)

    # 4. Redis에 캐시 저장 (5분)
    user_cache = {
        "id": str(user.id),
        "clerk_user_id": user.clerk_user_id,
        "email": user.email,
    }
    await redis.setex(cache_key, 300, json.dumps(user_cache))

    return user


# 성능 테스트용 캐시 없이 사용자 가져오기
async def get_current_user_no_cache(
    clerk_user_id: str = Depends(verify_clerk_token),
    db: Session = Depends(get_db),
) -> UserModel:
    """
    현재 인증된 사용자 가져오기 (캐시 없음 - 성능 비교용)
    매번 DB 조회
    """
    # DB에서 사용자 조회
    user = db.query(UserModel).filter(UserModel.clerk_user_id == clerk_user_id).first()

    # 사용자 없으면 자동 생성 (첫 로그인)
    if not user:
        user = UserModel(clerk_user_id=clerk_user_id)
        db.add(user)
        db.commit()
        db.refresh(user)

        # 기본 카테고리 생성
        create_default_categories(db, user.id)

    # 사용자 반환
    return user
