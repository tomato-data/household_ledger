from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    # 기본 키 (UUID 사용)
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    # Clerk 사용자 ID (유니크)
    clerk_user_id = Column(
        String(255), unique=True, nullable=False, index=True  # 빠른 조회를 위한 인덱스
    )

    # 이메일
    email = Column(String(255), nullable=True)

    # 타임스탬프
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # 관계 정의 (다른 모델들과의 연결)
    categories = relationship(
        "Category", back_populates="user", cascade="all, delete-orphan"
    )
    transactions = relationship(
        "Transaction", back_populates="user", cascade="all, delete-orphan"
    )
    recurring_transactions = relationship(
        "RecurringTransaction", back_populates="user", cascade="all, delete-orphan"
    )
    asset_adjustments = relationship(
        "AssetAdjustment", back_populates="user", cascade="all, delete-orphan"
    )
