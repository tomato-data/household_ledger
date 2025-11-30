import uuid
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import AdjustmentType


class AssetAdjustment(Base):
    __tablename__ = "asset_adjustments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 조정 금액 (항상 양수, type으로 방향 결정)
    amount = Column(Integer, nullable=False)

    # 조정 유형 (수입 누락 / 지출 누락)
    type = Column(Enum(AdjustmentType), nullable=False)

    # 조정 사유
    reason = Column(String(255), nullable=False)

    # 조정 날짜
    adjustment_date = Column(Date, nullable=False, index=True)

    # 타임스탬프
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationship
    user = relationship("User", back_populates="asset_adjustments")
